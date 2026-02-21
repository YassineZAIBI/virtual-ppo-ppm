import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const actions = await db.pendingAction.findMany({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(actions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionId, decision, settings } = await request.json();

    if (!actionId || !decision) {
      return NextResponse.json({ error: 'actionId and decision are required' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const action = await db.pendingAction.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if (decision === 'approve') {
      // Forward to Python service for execution
      const resp = await fetch(`${AGENT_SERVICE_URL}/agent/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          decision: 'approve',
          settings: {
            tool_name: action.toolName,
            tool_arguments: JSON.parse(action.toolArguments),
          },
        }),
      });

      const result = await resp.json();

      await db.pendingAction.update({
        where: { id: actionId },
        data: {
          status: result.is_error ? 'pending' : 'executed',
          result: result.result || result.content,
        },
      });

      return NextResponse.json(result);
    } else {
      await db.pendingAction.update({
        where: { id: actionId },
        data: { status: 'rejected' },
      });

      return NextResponse.json({ status: 'rejected', action_id: actionId });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}