import { UserJourneyView } from '@/components/views/UserJourneyView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function UserJourneyPage() {
  return (
    <ErrorBoundary>
      <UserJourneyView />
    </ErrorBoundary>
  );
}
