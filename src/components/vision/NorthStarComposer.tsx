'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Sparkles, Save, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type { NorthStarData } from '@/lib/types';

interface NorthStarComposerProps {
  northStar: NorthStarData | null;
  onSaved: () => void;
}

export function NorthStarComposer({ northStar, onSaved }: NorthStarComposerProps) {
  const [editing, setEditing] = useState(!northStar);
  const [statement, setStatement] = useState(northStar?.statement || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!statement.trim()) {
      toast.error('North Star statement cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: statement.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const saved = await res.json();
      useAppStore.getState().setNorthStar(saved);
      setEditing(false);
      toast.success('North Star saved!');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save North Star');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">North Star</CardTitle>
          </div>
          {northStar && !editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          The single purpose of your product or company. Why does it exist?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g., Empower every product manager to make data-driven decisions with confidence"
              className="min-h-[80px] text-base"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving || !statement.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save North Star
              </Button>
              {northStar && (
                <Button variant="ghost" onClick={() => { setEditing(false); setStatement(northStar.statement); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : northStar ? (
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground leading-relaxed">
              &ldquo;{northStar.statement}&rdquo;
            </p>
            {northStar.confidence > 0 && (
              <Badge variant="outline" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Confidence: {Math.round(northStar.confidence * 100)}%
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <Star className="h-10 w-10 text-amber-500/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Define your North Star to unlock vision-aligned strategy scoring
            </p>
            <Button onClick={() => setEditing(true)}>
              <Sparkles className="h-4 w-4 mr-1" />
              Set Your North Star
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
