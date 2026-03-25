import { UserJourneyView } from '@/components/views/UserJourneyView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function VisionAudiencesPage() {
  return (
    <ErrorBoundary>
      <UserJourneyView />
    </ErrorBoundary>
  );
}
