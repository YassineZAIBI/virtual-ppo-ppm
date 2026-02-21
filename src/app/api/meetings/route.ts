import { NextRequest, NextResponse } from 'next/server';
import { LLMService } from '@/lib/services/llm';
import { LLMConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { transcript, settings } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const llmConfig: LLMConfig = {
      provider: settings?.llm?.provider || 'openai',
      apiKey: settings?.llm?.apiKey || '',
      apiEndpoint: settings?.llm?.apiEndpoint,
      model: settings?.llm?.model,
    };

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
