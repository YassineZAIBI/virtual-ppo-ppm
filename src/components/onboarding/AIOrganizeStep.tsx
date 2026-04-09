'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Package, Pencil, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface VerticalGroup {
  name: string;
  initiatives: { id: string; title: string }[];
  editing?: boolean;
}

interface AIOrganizeStepProps {
  onComplete: () => void;
}

export function AIOrganizeStep({ onComplete }: AIOrganizeStepProps) {
  const { settings } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<VerticalGroup[]>([]);
  const [orphans, setOrphans] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetchInitiatives();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const unassigned = (Array.isArray(data) ? data : [])
        .filter((i: { verticalId?: string }) => !i.verticalId)
        .map((i: { id: string; title: string }) => ({ id: i.id, title: i.title }));

      if (unassigned.length === 0) {
        setOrphans([]);
        setLoading(false);
        return;
      }

      setOrphans(unassigned);
      await organizeWithAI(unassigned);
    } catch (err) {
      console.error('Failed to fetch initiatives:', err);
    } finally {
      setLoading(false);
    }
  };

  const organizeWithAI = async (items: { id: string; title: string }[]) => {
    setOrganizing(true);
    try {
      const llmConfig = settings?.llm;
      if (!llmConfig?.apiKey || items.length === 0) {
        // No LLM or no items — put all in one group
        setGroups([{ name: 'My Product', initiatives: items }]);
        setOrganizing(false);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Group these initiatives into 2-5 logical product verticals. Return JSON only (no markdown):

Initiatives:
${items.map(i => `- ${i.title}`).join('\n')}

Respond as:
[
  { "name": "Vertical Name", "initiatives": ["initiative title 1", "initiative title 2"] }
]`,
          }],
          llmConfig,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.response || data.content || '';
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const mapped = parsed.map((g: { name: string; initiatives: string[] }) => ({
              name: g.name,
              initiatives: g.initiatives
                .map((title: string) => items.find(i => i.title.toLowerCase() === title.toLowerCase()))
                .filter(Boolean) as { id: string; title: string }[],
            }));
            setGroups(mapped);
            return;
          }
        } catch {
          // parse failed — fall through to default
        }
      }
      // Fallback: single group
      setGroups([{ name: 'My Product', initiatives: items }]);
    } catch (err) {
      console.error('AI organization failed:', err);
      setGroups([{ name: 'My Product', initiatives: items }]);
    } finally {
      setOrganizing(false);
    }
  };

  const handleRenameGroup = (index: number, newName: string) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, name: newName, editing: false } : g));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const group of groups) {
        if (group.initiatives.length === 0) continue;

        const vRes = await fetch('/api/verticals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: group.name }),
        });
        if (!vRes.ok) continue;
        const vertical = await vRes.json();

        for (const init of group.initiatives) {
          await fetch(`/api/initiatives/${init.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verticalId: vertical.id }),
          });
        }
      }
      onComplete();
    } catch (err) {
      console.error('Failed to save organization:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || organizing) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {loading ? 'Loading your initiatives...' : 'AI is organizing your backlog...'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Grouping imported work into logical product verticals.
        </p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (orphans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">No imported initiatives found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            No unorganized work was found. You can create initiatives later in the Portfolio.
          </p>
        </div>
        <Button onClick={onComplete} className="w-full">Continue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review your organization</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {settings?.llm?.apiKey
            ? 'AI grouped your initiatives into verticals. Rename or reorganize as needed.'
            : 'Your initiatives are grouped below. Rename verticals as needed.'}
        </p>
      </div>
      <div className="space-y-3">
        {groups.map((group, idx) => (
          <Card key={idx}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-indigo-500" />
                {group.editing ? (
                  <Input
                    defaultValue={group.name}
                    autoFocus
                    className="h-7 text-sm"
                    onBlur={e => handleRenameGroup(idx, e.target.value || group.name)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameGroup(idx, (e.target as HTMLInputElement).value)}
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold">{group.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={() => setGroups(prev => prev.map((g, i) => i === idx ? { ...g, editing: true } : g))}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Badge variant="secondary" className="text-[10px] ml-auto">{group.initiatives.length}</Badge>
              </div>
              <div className="space-y-1">
                {group.initiatives.map(i => (
                  <div key={i.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="truncate">{i.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm organization'}
      </Button>
    </div>
  );
}
