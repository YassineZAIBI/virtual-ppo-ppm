import { InitiativesPipeline } from '@/components/views/InitiativesPipeline';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function InitiativesPage() {
  return (
    <ErrorBoundary>
      <InitiativesPipeline />
    </ErrorBoundary>
  );
}
