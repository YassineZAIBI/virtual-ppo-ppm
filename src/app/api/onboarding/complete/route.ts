import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveCompanyBrain } from '@/lib/services/company-brain';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    let identityData: { companyName?: string; industry?: string; website?: string; description?: string } = {};
    try {
      const body = await req.json();
      identityData = body.identityData || {};
    } catch {
      // Body may be empty for legacy calls
    }

    await db.onboardingProgress.upsert({
      where: { userId },
      update: { completed: true },
      create: { userId, completed: true },
    });

    await db.user.update({
      where: { id: userId },
      data: { visionComplete: true },
    });

    // Serialize full company profile into a KnowledgeDocument for agent context
    await saveCompanyBrain(userId, identityData);

    return NextResponse.json({ success: true, redirect: '/vision' });
  } catch (error: any) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
