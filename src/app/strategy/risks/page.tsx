'use client';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { RiskCenterView } from '@/components/views/RiskCenterView';

export default function StrategyRisksPage() {
  return (
    <ErrorBoundary>
      <RiskCenterView />
    </ErrorBoundary>
  );
}
