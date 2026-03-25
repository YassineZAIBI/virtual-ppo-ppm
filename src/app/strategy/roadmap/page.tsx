import { RoadmapView } from '@/components/views/RoadmapView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function StrategyRoadmapPage() {
  return (
    <ErrorBoundary>
      <RoadmapView />
    </ErrorBoundary>
  );
}
