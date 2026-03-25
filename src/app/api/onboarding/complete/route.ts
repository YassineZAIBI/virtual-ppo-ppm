import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await db.onboardingProgress.upsert({
      where: { userId },
      update: { completed: true },
      create: { userId, completed: true },
    });

    // Set visionComplete = true on the user
    await db.user.update({
      where: { id: userId },
      data: { visionComplete: true },
    });

    return NextResponse.json({ success: true, redirect: '/vision' });
  } catch (error: any) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
