import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LandscapeView } from '@/components/views/LandscapeView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function LandscapePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  return (
    <ErrorBoundary>
      <LandscapeView />
    </ErrorBoundary>
  );
}
