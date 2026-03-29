'use client';

import { useState } from 'react';
import { cn, parseTags } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

interface SuggestedCompetitor {
  name: string;
  website?: string;
  description?: string;
  tags?: string[];
}

const TAG_OPTIONS = ['direct', 'indirect', 'emerging'] as const;

const tagColorMap: Record<string, string> = {
  direct: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  indirect: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  emerging: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function CompetitorAddDialog({ open, onOpenChange, onAdded }: CompetitorAddDialogProps) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedCompetitor[]>([]);

  const resetForm = () => {
    setName('');
    setWebsite('');
    setDescription('');
    setTags([]);
    setSuggestions([]);
  };

  const handleTagToggle = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Competitor name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || undefined,
          description: description.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add competitor');
      }

      toast.success(`${name} added as a competitor`);
      resetForm();
      onOpenChange(false);
      onAdded();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add competitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAISuggest = async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/competitors/suggest', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to get suggestions');

      const data = await res.json();
      const items: SuggestedCompetitor[] = data.suggestions ?? data ?? [];
      setSuggestions(items);

      if (items.length === 0) {
        toast.info('No suggestions available. Try adding more context to your product vision.');
      }
    } catch (err) {
      toast.error('Could not generate suggestions');
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const handlePickSuggestion = (s: SuggestedCompetitor) => {
    setName(s.name);
    if (s.website) setWebsite(s.website);
    if (s.description) setDescription(s.description);
    const parsed = parseTags(s.tags);
    if (parsed.length > 0) setTags(parsed);
    setSuggestions([]);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* AI Suggest */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAISuggest}
            disabled={suggesting}
          >
            {suggesting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Generating suggestions...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Suggest Competitors
              </>
            )}
          </Button>

          {/* Suggestions list */}
          {suggestions.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Suggested competitors:</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left rounded-md border bg-card p-2.5 hover:bg-accent transition-colors"
                  onClick={() => handlePickSuggestion(s)}
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {s.description}
                    </p>
                  )}
                  {parseTags(s.tags).length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {parseTags(s.tags).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className={cn('text-[10px] capitalize', tagColorMap[tag] || '')}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual form */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Website</label>
              <Input
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Input
                placeholder="Brief description of this competitor"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                      tags.includes(tag)
                        ? cn(tagColorMap[tag], 'border-transparent')
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tags.includes(tag) && <X className="h-3 w-3" />}
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Competitor
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
