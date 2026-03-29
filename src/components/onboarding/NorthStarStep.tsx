'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Edit3, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface NorthStarStepProps {
  identityData: {
    companyName: string;
    industry: string;
    website: string;
    description: string;
  };
  northStar: string;
  mission: string;
  onNorthStarChange: (value: string) => void;
  onMissionChange: (value: string) => void;
}

export function NorthStarStep({
  identityData,
  northStar,
  mission,
  onNorthStarChange,
  onMissionChange,
}: NorthStarStepProps) {
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const { settings } = useAppStore();

  const handleExtract = async () => {
    if (!settings?.llm?.apiKey) {
      toast.error('Please configure your LLM provider in Settings first.');
      return;
    }

    setExtracting(true);
    try {
      // Build sources array from identity data
      const sources: { type: string; content: string }[] = [];
      const textParts: string[] = [];
      if (identityData.companyName) textParts.push(`Company: ${identityData.companyName}`);
      if (identityData.industry) textParts.push(`Industry: ${identityData.industry}`);
      if (identityData.description) textParts.push(`Description: ${identityData.description}`);
      if (textParts.length > 0) {
        sources.push({ type: 'text', content: textParts.join('\n') });
      }
      if (identityData.website?.trim()) {
        sources.push({ type: 'url', content: identityData.website.trim() });
      }

      const res = await fetch('/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources,
          llmConfig: {
            provider: settings.llm.provider,
            apiKey: settings.llm.apiKey,
            model: settings.llm.model,
            apiEndpoint: settings.llm.apiEndpoint,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const ns = data.proposed?.northStar?.statement;
        const ms = data.proposed?.mission;
        if (ns) onNorthStarChange(ns);
        if (ms) onMissionChange(ms);
        setExtracted(true);
        toast.success('Vision extracted! Review and refine below.');
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || 'Extraction failed — please fill in manually.');
      }
    } catch {
      toast.error('Failed to extract vision. Please enter manually.');
    } finally {
      setExtracting(false);
    }
  };

  const hasIdentity = identityData.companyName.trim() || identityData.description.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Define your North Star</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your North Star is the single metric or statement that guides all product decisions.
        </p>
      </div>

      {/* AI Extraction */}
      {!extracted && (
        <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
          <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {hasIdentity
              ? 'Let AI propose your North Star based on the information you provided.'
              : 'Go back to Step 1 to add product info, or fill in manually below.'}
          </p>
          <Button
            onClick={handleExtract}
            disabled={extracting || !hasIdentity}
            variant="outline"
            className="gap-2"
          >
            {extracting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Extracting...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Extract with AI</>
            )}
          </Button>
        </div>
      )}

      {extracted && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>AI extracted a draft — review and refine below.</span>
        </div>
      )}

      {/* North Star */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Label htmlFor="northStar">North Star Statement</Label>
          {extracted && <Badge variant="secondary" className="text-[10px]">AI Proposed</Badge>}
        </div>
        <Textarea
          id="northStar"
          placeholder="e.g. Increase the number of weekly active users who complete a core workflow"
          rows={3}
          value={northStar}
          onChange={(e) => onNorthStarChange(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          This should be a measurable outcome that reflects real value for your users.
        </p>
      </div>

      {/* Mission */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Label htmlFor="mission">Mission Statement (optional)</Label>
          {extracted && mission && <Badge variant="secondary" className="text-[10px]">AI Proposed</Badge>}
        </div>
        <Textarea
          id="mission"
          placeholder="e.g. Empower product teams to make data-driven decisions faster"
          rows={2}
          value={mission}
          onChange={(e) => onMissionChange(e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );
}
