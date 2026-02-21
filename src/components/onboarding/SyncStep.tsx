'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import {
  CheckCircle2, Loader2, AlertCircle, Download, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStepProps {
  credentials: {
    jira: { url: string; email: string; apiToken: string };
    confluence: { url: string; email: string; apiToken: string };
    slack: { botToken: string; channelId: string };
  };
  connected: { jira: boolean; confluence: boolean; slack: boolean };
  onSyncComplete: (results: any) => void;
}

interface PreviewItem {
  externalId: string;
  title: string;
  source: 'jira' | 'confluence' | 'slack';
  type: string;
  details?: string;
  selected: boolean;
}

export function SyncStep({ credentials, connected, onSyncComplete }: SyncStepProps) {
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<any>(null);
  const { settings } = useAppStore();

  const hasConnections = connected.jira || connected.confluence || connected.slack;

  const handlePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const syncCredentials: any = {};
      if (connected.jira) syncCredentials.jira = credentials.jira;
      if (connected.confluence) syncCredentials.confluence = credentials.confluence;
      if (connected.slack) syncCredentials.slack = credentials.slack;

      const response = await fetch('/api/onboarding/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          credentials: syncCredentials,
          llmConfig: settings.llm.apiKey ? settings.llm : undefined,
        }),
      });

      const data = await response.json();
      setPreviewItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: item.type !== 'error',
        }))
      );
    } catch {
      toast.error('Failed to load preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);

    try {
      const syncCredentials: any = {};
      if (connected.jira) syncCredentials.jira = credentials.jira;
      if (connected.confluence) syncCredentials.confluence = credentials.confluence;
      if (connected.slack) syncCredentials.slack = credentials.slack;

      const selectedIds = previewItems
        .filter((item) => item.selected && item.type !== 'error')
        .map((item) => item.externalId);

      setSyncProgress(30);

      const response = await fetch('/api/onboarding/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          credentials: syncCredentials,
          llmConfig: settings.llm.apiKey ? settings.llm : undefined,
          selectedIds,
        }),
      });

      setSyncProgress(80);

      const data = await response.json();
      setSyncResults(data.results);
      onSyncComplete(data.results);
      setSyncProgress(100);
      toast.success('Sync completed!');
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleItem = (externalId: string) => {
    setPreviewItems((items) =>
      items.map((item) =>
        item.externalId === externalId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const toggleAll = (selected: boolean) => {
    setPreviewItems((items) =>
      items.map((item) => (item.type !== 'error' ? { ...item, selected } : item))
    );
  };

  if (!hasConnections) {
    return (
      <div className="text-center space-y-4 py-8">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Integrations Connected</h2>
          <p className="text-slate-500 mt-2">
            You haven&apos;t connected any integrations yet. Go back to connect Jira, Confluence, or Slack,
            or skip this step to set them up later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Your Data</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review and select items to import from your connected integrations.
        </p>
      </div>

      {/* Connected integrations summary */}
      <div className="flex gap-2">
        {connected.jira && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Jira</Badge>}
        {connected.confluence && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Confluence</Badge>}
        {connected.slack && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Slack</Badge>}
      </div>

      {/* Preview / Sync buttons */}
      {previewItems.length === 0 && !syncResults && (
        <Button onClick={handlePreview} disabled={isLoadingPreview} className="w-full gap-2">
          {isLoadingPreview ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Scanning integrations...</>
          ) : (
            <><Download className="h-4 w-4" /> Scan for Items to Import</>
          )}
        </Button>
      )}

      {/* Preview list */}
      {previewItems.length > 0 && !syncResults && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {previewItems.filter((i) => i.selected).length} of {previewItems.filter((i) => i.type !== 'error').length} items selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Select All</Button>
              <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Deselect All</Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
            {previewItems.map((item) => (
              <label
                key={item.externalId}
                className={`flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                  item.type === 'error' ? 'opacity-50' : ''
                }`}
              >
                {item.type !== 'error' && (
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item.externalId)}
                    className="rounded"
                  />
                )}
                {item.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.source}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.details && <p className="text-xs text-slate-500 truncate">{item.details}</p>}
                </div>
              </label>
            ))}
          </div>

          <Button
            onClick={handleSync}
            disabled={isSyncing || previewItems.filter((i) => i.selected).length === 0}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSyncing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
            ) : (
              <><Download className="h-4 w-4" /> Import Selected Items</>
            )}
          </Button>

          {isSyncing && <Progress value={syncProgress} className="h-2" />}
        </>
      )}

      {/* Sync results */}
      {syncResults && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Sync Complete!</span>
          </div>
          {syncResults.map((result: any) => (
            <div key={result.source} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{result.source}</span>
                <div className="flex gap-2 text-sm">
                  <span className="text-green-600">{result.imported} imported</span>
                  {result.skipped > 0 && <span className="text-slate-500">{result.skipped} skipped</span>}
                  {result.failed > 0 && <span className="text-red-500">{result.failed} failed</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
