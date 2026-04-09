'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface AIBackfillStepProps {
  initiativeTitle: string;
  initiativeDescription: string;
  onComplete: () => void;
}

export function AIBackfillStep({ initiativeTitle, initiativeDescription, onComplete }: AIBackfillStepProps) {
  const { settings } = useAppStore();
  const [generating, setGenerating] = useState(true);
  const [northStar, setNorthStar] = useState('');
  const [goal, setGoal] = useState('');
  const [persona, setPersona] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    generateVision();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateVision = async () => {
    setGenerating(true);
    try {
      const llmConfig = settings?.llm;
      if (!llmConfig?.apiKey) {
        // No LLM configured — show manual fields
        setGenerating(false);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Based on this product initiative, generate a concise north star statement, one business goal, and one target persona.

Initiative: ${initiativeTitle}
Description: ${initiativeDescription}

Respond in JSON format only (no markdown):
{
  "northStar": "one sentence vision statement",
  "goal": "one measurable business goal",
  "persona": "one target user type with their key need"
}`,
          }],
          llmConfig,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Try parsing the response as JSON
        const content = data.response || data.content || data.message || '';
        try {
          const parsed = JSON.parse(content);
          setNorthStar(parsed.northStar || '');
          setGoal(parsed.goal || '');
          setPersona(parsed.persona || '');
        } catch {
          // If JSON parse fails, use as north star
          setNorthStar(content);
        }
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (northStar.trim()) {
        await fetch('/api/vision/north-star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statement: northStar.trim() }),
        });
      }
      if (goal.trim()) {
        await fetch('/api/vision/business-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: goal.trim() }),
        });
      }
      if (persona.trim()) {
        await fetch('/api/vision/target-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: persona.trim() }),
        });
      }
      onComplete();
    } catch (err) {
      console.error('Failed to save vision:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (generating) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">AI is setting up your vision...</h2>
        <p className="text-sm text-muted-foreground">
          Based on &ldquo;{initiativeTitle}&rdquo;, we&apos;re generating your strategic foundation.
        </p>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review your vision</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {settings?.llm?.apiKey
            ? 'AI-generated from your product description. Edit anything that doesn\u2019t feel right.'
            : 'Fill in your product vision. You can always refine later.'}
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">North star</label>
          <Textarea value={northStar} onChange={e => setNorthStar(e.target.value)} rows={2} className="mt-1" placeholder="Your guiding vision statement" />
        </div>
        <div>
          <label className="text-sm font-medium">First business goal</label>
          <Textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} className="mt-1" placeholder="A measurable business goal" />
        </div>
        <div>
          <label className="text-sm font-medium">Primary persona</label>
          <Textarea value={persona} onChange={e => setPersona(e.target.value)} rows={2} className="mt-1" placeholder="Who is this for? What do they need?" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Looks good \u2014 continue'}
        </Button>
        {settings?.llm?.apiKey && (
          <Button variant="outline" onClick={generateVision} disabled={generating}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
