'use client';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { ValueMeterView } from '@/components/views/ValueMeterView';

export default function ValueMeterPage() {
  return (
    <ErrorBoundary>
      <ValueMeterView />
    </ErrorBoundary>
  );
}
