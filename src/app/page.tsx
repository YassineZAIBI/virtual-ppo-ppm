import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardView } from '@/components/views/DashboardView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { LandingPage } from '@/components/landing/LandingPage';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LandingPage />;
  }

  return (
    <ErrorBoundary>
      <DashboardView />
    </ErrorBoundary>
  );
}
