'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FirstProductStepProps {
  onComplete: (data: { verticalId: string; initiativeId: string; title: string; description: string }) => void;
}

export function FirstProductStep({ onComplete }: FirstProductStepProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const vRes = await fetch('/api/verticals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!vRes.ok) throw new Error('Failed to create vertical');
      const vertical = await vRes.json();

      const iRes = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name.trim(),
          description: description.trim(),
          status: 'idea',
          businessValue: 'high',
          effort: 'medium',
          verticalId: vertical.id,
        }),
      });
      if (!iRes.ok) throw new Error('Failed to create initiative');
      const initiative = await iRes.json();

      onComplete({
        verticalId: vertical.id,
        initiativeId: initiative.id,
        title: name.trim(),
        description: description.trim(),
      });
    } catch (err) {
      console.error('Failed to create product:', err);
      toast.error('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What are you building?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Name your product or feature. We&apos;ll organize everything from here.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Product name</label>
          <Input
            placeholder="e.g., Customer portal, Mobile app, Analytics dashboard"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Brief description</label>
          <Textarea
            placeholder="What does it do? Who is it for? Keep it simple."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!name.trim() || loading} className="w-full">
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Continue'}
      </Button>
    </div>
  );
}
