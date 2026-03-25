'use client';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { TacticsView } from '@/components/views/TacticsView';

export default function TacticsPage() {
  return (
    <ErrorBoundary>
      <TacticsView />
    </ErrorBoundary>
  );
}
