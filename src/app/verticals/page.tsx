import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProductVerticalsView } from '@/components/views/ProductVerticalsView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function VerticalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');
  return <ErrorBoundary><ProductVerticalsView /></ErrorBoundary>;
}
