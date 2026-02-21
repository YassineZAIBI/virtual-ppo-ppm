import { DashboardView } from '@/components/views/DashboardView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function HomePage() {
  return (
    <ErrorBoundary>
      <DashboardView />
    </ErrorBoundary>
  );
}
