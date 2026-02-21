import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let onboarding = await db.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!onboarding) {
      onboarding = await db.onboardingProgress.create({
        data: { userId },
      });
    }

    return NextResponse.json({
      currentStep: onboarding.currentStep,
      completed: onboarding.completed,
      jiraConnected: onboarding.jiraConnected,
      confluenceConnected: onboarding.confluenceConnected,
      slackConnected: onboarding.slackConnected,
      syncStarted: onboarding.syncStarted,
      syncCompleted: onboarding.syncCompleted,
      syncLog: JSON.parse(onboarding.syncLog || '[]'),
    });
  } catch (error: any) {
    console.error('Onboarding status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const onboarding = await db.onboardingProgress.upsert({
      where: { userId },
      update: {
        currentStep: body.currentStep ?? undefined,
        jiraConnected: body.jiraConnected ?? undefined,
        confluenceConnected: body.confluenceConnected ?? undefined,
        slackConnected: body.slackConnected ?? undefined,
        syncStarted: body.syncStarted ?? undefined,
        syncCompleted: body.syncCompleted ?? undefined,
        syncLog: body.syncLog ? JSON.stringify(body.syncLog) : undefined,
      },
      create: {
        userId,
        currentStep: body.currentStep ?? 0,
      },
    });

    return NextResponse.json({
      currentStep: onboarding.currentStep,
      completed: onboarding.completed,
      jiraConnected: onboarding.jiraConnected,
      confluenceConnected: onboarding.confluenceConnected,
      slackConnected: onboarding.slackConnected,
    });
  } catch (error: any) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
