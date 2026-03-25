'use client';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { VisionBoardView } from '@/components/vision/VisionBoardView';

export default function VisionPage() {
  return (
    <ErrorBoundary>
      <VisionBoardView />
    </ErrorBoundary>
  );
}
