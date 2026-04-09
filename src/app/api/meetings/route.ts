import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService } from '@/lib/services/llm';
import { LLMConfig } from '@/lib/types';

function parseJsonField(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function normalizeMeeting(meeting: Record<string, unknown>) {
  return {
    ...meeting,
    participants: parseJsonField(meeting.participants),
    actionItems: parseJsonField(meeting.actionItems),
    decisions: parseJsonField(meeting.decisions),
    challenges: parseJsonField(meeting.challenges),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetings = await db.meeting.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(meetings.map(m => normalizeMeeting(m as unknown as Record<string, unknown>)));
  } catch (error) {
    console.error('[MEETINGS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, settings: bodySettings, llmConfig: directConfig } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const src = directConfig || bodySettings?.llm || {};
    const llmConfig: LLMConfig = {
      provider: src.provider || 'openai',
      apiKey: src.apiKey || '',
      apiEndpoint: src.apiEndpoint,
      model: src.model,
    };

    if (!llmConfig.apiKey) {
      return NextResponse.json({ error: 'LLM not configured. Please set up your LLM provider in Settings.' }, { status: 400 });
    }

    const llm = LLMService.create(llmConfig);

    const analysisPrompt = `Analyze the following meeting transcript and extract key information.

TRANSCRIPT:
${transcript}

Provide your response in this exact JSON format (no markdown, just raw JSON):
{
  "title": "Meeting Title",
  "summary": "Brief 2-3 sentence summary",
  "actionItems": [
    {"description": "Action item description", "assignee": "Person name or Unassigned", "dueDate": null}
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "challenges": ["Challenge 1", "Challenge 2"],
  "followUps": ["Follow-up item 1"]
}`;

    const responseText = await llm.chat([
      { role: 'system', content: 'You are an expert meeting analyst. Extract structured information from meeting transcripts. Always respond with valid JSON only, no markdown code blocks.' },
      { role: 'user', content: analysisPrompt }
    ], { temperature: 0.3, maxTokens: 2000 });

    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found');
      }
    } catch {
      analysis = {
        title: 'Meeting Summary',
        summary: responseText.substring(0, 500),
        actionItems: [],
        decisions: [],
        challenges: [],
        followUps: []
      };
    }

    const formattedActionItems = (analysis.actionItems || []).map((item: any, index: number) => ({
      id: `action-${Date.now()}-${index}`,
      description: typeof item === 'string' ? item : item.description || '',
      assignee: item.assignee || 'Unassigned',
      dueDate: item.dueDate || null,
      status: 'pending',
      source: 'meeting'
    }));

    // Persist to database
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await db.meeting.create({
          data: {
            userId: session.user.id,
            title: analysis.title || 'Meeting Summary',
            summary: analysis.summary || 'Unable to generate summary.',
            transcript,
            status: 'summarized',
            actionItems: JSON.stringify(formattedActionItems),
            decisions: JSON.stringify(analysis.decisions || []),
            challenges: JSON.stringify(analysis.challenges || []),
          },
        });
      } catch (e) {
        console.error('[MEETINGS_POST] DB persist error:', e);
      }
    }

    return NextResponse.json({
      title: analysis.title || 'Meeting Summary',
      summary: analysis.summary || 'Unable to generate summary.',
      actionItems: formattedActionItems,
      decisions: analysis.decisions || [],
      challenges: analysis.challenges || [],
      followUps: analysis.followUps || []
    });
  } catch (error: any) {
    console.error('Meeting processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process meeting', details: error.message },
      { status: 500 }
    );
  }
}
