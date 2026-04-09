'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PersonasStepProps {
  onComplete: () => void;
}

export function PersonasStep({ onComplete }: PersonasStepProps) {
  const [personas, setPersonas] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const addPersona = () => setPersonas(prev => [...prev, '']);
  const removePersona = (i: number) => setPersonas(prev => prev.filter((_, idx) => idx !== i));
  const updatePersona = (i: number, value: string) => setPersonas(prev => prev.map((p, idx) => idx === i ? value : p));

  const handleSave = async () => {
    const valid = personas.filter(p => p.trim());
    if (valid.length === 0) {
      onComplete();
      return;
    }
    setSaving(true);
    try {
      for (const name of valid) {
        await fetch('/api/vision/target-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
      }
      onComplete();
    } catch (err) {
      console.error('Failed to save personas:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Who are your audiences?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Define the key user types or customer segments you serve.
        </p>
      </div>
      <div className="space-y-2">
        {personas.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Users className="h-4 w-4 text-pink-500 flex-shrink-0" />
            <Input
              placeholder={`e.g., ${['Enterprise admin', 'Developer', 'End user', 'Data analyst'][i] || 'Another persona'}`}
              value={p}
              onChange={e => updatePersona(i, e.target.value)}
            />
            {personas.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removePersona(i)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPersona} className="gap-1">
          <Plus className="h-3 w-3" /> Add persona
        </Button>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Continue'}
      </Button>
    </div>
  );
}
