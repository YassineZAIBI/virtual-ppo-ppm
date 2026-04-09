import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AssessmentView } from '@/components/views/AssessmentView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function AssessmentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  return (
    <ErrorBoundary>
      <AssessmentView />
    </ErrorBoundary>
  );
}
