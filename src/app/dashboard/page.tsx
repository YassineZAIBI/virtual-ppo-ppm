import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardView } from '@/components/views/DashboardView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <ErrorBoundary>
      <DashboardView />
    </ErrorBoundary>
  );
}
