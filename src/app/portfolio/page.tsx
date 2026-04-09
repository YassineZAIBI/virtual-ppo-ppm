import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PortfolioView } from '@/components/views/PortfolioView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Suspense } from 'react';

export default async function PortfolioPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  return (
    <ErrorBoundary>
      <Suspense>
        <PortfolioView />
      </Suspense>
    </ErrorBoundary>
  );
}
