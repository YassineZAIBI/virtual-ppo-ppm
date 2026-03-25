'use client';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { EvaluatorView } from '@/components/views/EvaluatorView';

export default function StrategyEvaluatorPage() {
  return (
    <ErrorBoundary>
      <EvaluatorView />
    </ErrorBoundary>
  );
}
