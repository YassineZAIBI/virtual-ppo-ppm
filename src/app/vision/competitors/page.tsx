'use client';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { CompetitorsEyeView } from '@/components/views/CompetitorsEyeView';

export default function CompetitorsPage() {
  return (
    <ErrorBoundary>
      <CompetitorsEyeView />
    </ErrorBoundary>
  );
}
