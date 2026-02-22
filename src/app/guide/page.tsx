import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { GettingStartedGuide } from '@/components/views/GettingStartedGuide';

export default async function GuidePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  return <GettingStartedGuide />;
}
