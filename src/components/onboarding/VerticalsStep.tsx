'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface VerticalsStepProps {
  onComplete: () => void;
}

export function VerticalsStep({ onComplete }: VerticalsStepProps) {
  const [verticals, setVerticals] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const addVertical = () => setVerticals(prev => [...prev, '']);
  const removeVertical = (i: number) => setVerticals(prev => prev.filter((_, idx) => idx !== i));
  const updateVertical = (i: number, value: string) => setVerticals(prev => prev.map((v, idx) => idx === i ? value : v));

  const handleSave = async () => {
    const valid = verticals.filter(v => v.trim());
    if (valid.length === 0) {
      onComplete();
      return;
    }
    setSaving(true);
    try {
      for (const name of valid) {
        await fetch('/api/verticals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
      }
      onComplete();
    } catch (err) {
      console.error('Failed to save verticals:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Define your product lines</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Verticals are the major product areas or business units you manage. Initiatives will be organized inside them.
        </p>
      </div>
      <div className="space-y-2">
        {verticals.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <Input
              placeholder={`e.g., ${['Core Platform', 'Mobile App', 'API & Integrations', 'Analytics'][i] || 'Another vertical'}`}
              value={v}
              onChange={e => updateVertical(i, e.target.value)}
            />
            {verticals.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeVertical(i)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addVertical} className="gap-1">
          <Plus className="h-3 w-3" /> Add vertical
        </Button>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Continue'}
      </Button>
    </div>
  );
}
