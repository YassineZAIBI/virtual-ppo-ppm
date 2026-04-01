import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IntegrationsHubView } from '@/components/views/IntegrationsHubView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');
  return (
    <ErrorBoundary>
      <IntegrationsHubView />
    </ErrorBoundary>
  );
}
