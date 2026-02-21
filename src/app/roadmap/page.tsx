import { RoadmapView } from '@/components/views/RoadmapView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function RoadmapPage() {
  return (
    <ErrorBoundary>
      <RoadmapView />
    </ErrorBoundary>
  );
}
