'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Boxes } from 'lucide-react';
import { toast } from 'sonner';

interface Suggestion {
  jiraProjectKey?: string;
  jiraProjectName?: string;
  linearTeamKey?: string;
  linearTeamName?: string;
  suggestedVerticalName: string;
}

interface JiraDiscoveryModalProps {
  open: boolean;
  onClose: () => void;
  type: 'jira' | 'linear';
  suggestions: Suggestion[];
}

export function JiraDiscoveryModal({ open, onClose, type, suggestions }: JiraDiscoveryModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(suggestions.map((_, i) => i)));
  const [creating, setCreating] = useState(false);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    let created = 0;
    try {
      for (const idx of selected) {
        const s = suggestions[idx];
        const metadata: Record<string, string> = {};
        if (s.jiraProjectKey) metadata.jiraProjectKey = s.jiraProjectKey;
        if (s.linearTeamKey) metadata.linearTeamKey = s.linearTeamKey;

        const res = await fetch('/api/verticals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.suggestedVerticalName,
            description: `Imported from ${type === 'jira' ? 'Jira' : 'Linear'}`,
          }),
        });
        if (res.ok) created++;
      }
      toast.success(`Created ${created} product vertical${created !== 1 ? 's' : ''}`);
      onClose();
    } catch {
      toast.error('Failed to create verticals');
    } finally {
      setCreating(false);
    }
  };

  const label = type === 'jira' ? 'Jira projects' : 'Linear teams';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-indigo-500" />
            We found {suggestions.length} {label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which ones to create as Product Verticals
          </p>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors ${
                selected.has(i) ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-border'
              }`}
              onClick={() => toggle(i)}
            >
              <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                selected.has(i) ? 'bg-indigo-500 border-indigo-500' : 'border-muted-foreground/30'
              }`}>
                {selected.has(i) && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{s.suggestedVerticalName}</span>
                {(s.jiraProjectKey || s.linearTeamKey) && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {s.jiraProjectKey || s.linearTeamKey}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>Dismiss</Button>
          <Button onClick={handleCreate} disabled={creating || selected.size === 0}>
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating...</>
            ) : (
              <>Create {selected.size} Vertical{selected.size !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
