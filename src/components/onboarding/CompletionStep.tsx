'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, PartyPopper, ArrowRight } from 'lucide-react';

interface CompletionStepProps {
  connected: { jira: boolean; confluence: boolean; slack: boolean };
  syncResults: any;
  onComplete: () => void;
}

export function CompletionStep({ connected, syncResults, onComplete }: CompletionStepProps) {
  const connectedCount = [connected.jira, connected.confluence, connected.slack].filter(Boolean).length;
  const totalImported = syncResults
    ? syncResults.reduce((sum: number, r: any) => sum + (r.imported || 0), 0)
    : 0;

  return (
    <div className="text-center space-y-6 py-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">You&apos;re All Set!</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Your Azmyra workspace is ready to go.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
          <p className="text-2xl font-bold text-blue-600">{connectedCount}</p>
          <p className="text-sm text-slate-500">Integrations Connected</p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
          <p className="text-2xl font-bold text-green-600">{totalImported}</p>
          <p className="text-sm text-slate-500">Items Imported</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-purple-600" />
            <p className="text-lg font-bold text-purple-600">Ready</p>
          </div>
          <p className="text-sm text-slate-500">AI Assistant</p>
        </div>
      </div>

      <Button onClick={onComplete} className="gap-2 bg-blue-600 hover:bg-blue-700" size="lg">
        Go to Dashboard <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
