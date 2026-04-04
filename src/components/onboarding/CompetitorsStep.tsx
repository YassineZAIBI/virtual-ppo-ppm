'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Plus, X, Binoculars, CheckCircle2, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface CompetitorEntry {
  name: string;
  websiteUrl: string;
  source: string;
}

interface CompetitorsStepProps {
  identityData: {
    companyName: string;
    industry: string;
    description: string;
  };
  competitors: CompetitorEntry[];
  onCompetitorsChange: (competitors: CompetitorEntry[]) => void;
}

export function CompetitorsStep({
  identityData,
  competitors,
  onCompetitorsChange,
}: CompetitorsStepProps) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/competitors/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: identityData.companyName,
          industry: identityData.industry,
          description: identityData.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const suggestions: CompetitorEntry[] = (data.competitors || data.suggestions || []).map((c: any) => ({
          name: c.name || c,
          websiteUrl: c.websiteUrl || c.url || '',
          source: 'ai_suggestion',
        }));
        if (suggestions.length > 0) {
          onCompetitorsChange([...competitors, ...suggestions]);
          setSuggested(true);
          toast.success(`Found ${suggestions.length} competitor suggestions!`);
        } else {
          toast.info('No suggestions found. Add competitors manually.');
        }
      } else {
        toast.error('Suggestion failed — add competitors manually.');
      }
    } catch {
      toast.error('Failed to suggest competitors.');
    } finally {
      setSuggesting(false);
    }
  };

  const addCompetitor = () => {
    if (!newName.trim()) return;
    onCompetitorsChange([
      ...competitors,
      { name: newName.trim(), websiteUrl: newUrl.trim(), source: 'manual' },
    ]);
    setNewName('');
    setNewUrl('');
  };

  const removeCompetitor = (index: number) => {
    onCompetitorsChange(competitors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Identify your competitors</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track competitors to stay ahead. Azmyra can auto-suggest based on your product.
        </p>
      </div>

      {/* AI Suggestion */}
      {!suggested && (
        <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
          <Binoculars className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Let AI discover competitors in your space.
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={!identityData.companyName.trim() ? 0 : undefined}>
                  <Button
                    onClick={handleSuggest}
                    disabled={suggesting || !identityData.companyName.trim()}
                    variant="outline"
                    className="gap-2"
                  >
                    {suggesting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Suggest Competitors</>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!identityData.companyName.trim() && (
                <TooltipContent>
                  <p>Complete your Identity step first (company name required)</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {suggested && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Competitors suggested. Review and adjust below.</span>
        </div>
      )}

      {/* Competitor List */}
      {competitors.length > 0 && (
        <div className="space-y-2">
          {competitors.map((comp, i) => (
            <Card key={i}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Binoculars className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{comp.name}</p>
                      {comp.websiteUrl && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {comp.websiteUrl}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{comp.source === 'ai_suggestion' ? 'AI' : 'Manual'}</Badge>
                  </div>
                  <button onClick={() => removeCompetitor(i)} className="text-muted-foreground hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add manually */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Add manually</p>
          <div className="flex gap-2">
            <Input
              placeholder="Competitor name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Website (optional)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={addCompetitor} disabled={!newName.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        You can always manage competitors later in Competitors Eye.
      </p>
    </div>
  );
}
