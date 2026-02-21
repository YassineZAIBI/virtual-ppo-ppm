'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { DiscoveryView } from '@/components/views/DiscoveryView';

function DiscoveryContent() {
  return <DiscoveryView />;
}

export default function DiscoveryPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-slate-500">Loading discovery...</p></div>}>
        <DiscoveryContent />
      </Suspense>
    </ErrorBoundary>
  );
}
