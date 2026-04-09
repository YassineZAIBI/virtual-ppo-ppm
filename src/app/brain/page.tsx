import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BrainView } from '@/components/views/BrainView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function BrainPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');
  return <ErrorBoundary><BrainView /></ErrorBoundary>;
}
