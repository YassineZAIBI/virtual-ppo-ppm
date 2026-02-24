import { NextRequest, NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/tools/executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, decision, toolName, toolArguments, settings } = body;

    if (!actionId || !decision) {
      return NextResponse.json({ error: 'actionId and decision are required' }, { status: 400 });
    }

    if (decision === 'reject') {
      return NextResponse.json({ status: 'rejected', actionId });
    }

    if (decision === 'approve') {
      // Get tool info from the request body (client sends it along)
      const tool = toolName || settings?.tool_name;
      const args = toolArguments || settings?.tool_arguments || {};

      if (!tool) {
        return NextResponse.json({ error: 'toolName is required for approval' }, { status: 400 });
      }

      // Get Jira credentials from settings
      const jiraCreds = {
        url: settings?.integrations?.jira?.url || '',
        email: settings?.integrations?.jira?.email || '',
        apiToken: settings?.integrations?.jira?.apiToken || '',
        projectKey: settings?.integrations?.jira?.projectKey || '',
      };

      const result = await executeToolCall(tool, args, jiraCreds);

      // Try to update DB record if it exists (gracefully skip if not)
      try {
        const { db } = await import('@/lib/db');
        await db.pendingAction.update({
          where: { id: actionId },
          data: {
            status: result.success ? 'executed' : 'pending',
            result: JSON.stringify(result.result || result.error),
          },
        });
      } catch {
        // Action only exists in client-side Zustand store — that's fine
      }

      return NextResponse.json({
        success: result.success,
        result: result.result,
        error: result.error,
        storeAction: result.storeAction,
      });
    }

    return NextResponse.json({ error: 'Invalid decision. Use: approve, reject' }, { status: 400 });
  } catch (error: any) {
    console.error('Action execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
