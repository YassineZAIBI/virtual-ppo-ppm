import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTeamsAccessToken, getTeamsTranscript, leaveTeamsCall } from '@/lib/services/teams-bot';
import { LLMService } from '@/lib/services/llm';
import { LLMConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, credentials, llmConfig } = await request.json();
    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const meeting = await db.meeting.findFirst({
      where: { id: meetingId, userId: session.user.id },
    });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    let transcript = meeting.liveTranscript || '';

    if (meeting.platform === 'zoom' && meeting.botSessionId) {
      const botServiceUrl = process.env.MEETING_BOT_SERVICE_URL || 'http://meeting-bot:8300';
      try {
        const res = await fetch(`${botServiceUrl}/bot/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: meeting.botSessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) transcript = data.transcript;
        }
      } catch (err) {
        console.error('[BOT_LEAVE] Zoom bot leave error:', err);
      }
    } else if (meeting.platform === 'teams' && meeting.botSessionId) {
      try {
        const accessToken = await getTeamsAccessToken({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          tenantId: process.env.AZURE_AD_TENANT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        });
        // Fetch transcript before leaving
        const teamsTranscript = await getTeamsTranscript(accessToken, meeting.meetingUrl || meeting.botSessionId);
        if (teamsTranscript) transcript = teamsTranscript;
        // Leave the call
        await leaveTeamsCall(accessToken, meeting.botSessionId);
      } catch (err) {
        console.error('[BOT_LEAVE] Teams leave error:', err);
      }
    }

    // Run LLM analysis on transcript
    let analysis: any = { title: 'Meeting Summary', summary: '', actionItems: [], decisions: [], challenges: [] };

    if (transcript && llmConfig?.apiKey) {
      try {
        const llm = LLMService.create(llmConfig as LLMConfig);
        const responseText = await llm.chat([
          { role: 'system', content: 'You are an expert meeting analyst. Extract structured information from meeting transcripts. Always respond with valid JSON only, no markdown code blocks.' },
          { role: 'user', content: `Analyze the following meeting transcript and extract key information.\n\nTRANSCRIPT:\n${transcript}\n\nProvide your response in this exact JSON format (no markdown, just raw JSON):\n{\n  "title": "Meeting Title",\n  "summary": "Brief 2-3 sentence summary",\n  "actionItems": [\n    {"description": "Action item description", "assignee": "Person name or Unassigned", "dueDate": null}\n  ],\n  "decisions": ["Decision 1", "Decision 2"],\n  "challenges": ["Challenge 1", "Challenge 2"]\n}` }
        ], { temperature: 0.3, maxTokens: 2000 });

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.error('[BOT_LEAVE] LLM analysis error:', err);
      }
    }

    const formattedActionItems = (analysis.actionItems || []).map((item: any, index: number) => ({
      id: `action-${Date.now()}-${index}`,
      description: typeof item === 'string' ? item : item.description || '',
      assignee: item.assignee || 'Unassigned',
      dueDate: item.dueDate || null,
      status: 'pending',
      source: meetingId,
    }));

    // Update meeting in DB
    await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'summarized',
        transcript,
        title: analysis.title || 'Meeting Summary',
        summary: analysis.summary || '',
        actionItems: JSON.stringify(formattedActionItems),
        decisions: JSON.stringify(analysis.decisions || []),
        challenges: JSON.stringify(analysis.challenges || []),
      },
    });

    return NextResponse.json({
      title: analysis.title || 'Meeting Summary',
      summary: analysis.summary || '',
      actionItems: formattedActionItems,
      decisions: analysis.decisions || [],
      challenges: analysis.challenges || [],
      transcript,
    });
  } catch (error: any) {
    console.error('[BOT_LEAVE]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
