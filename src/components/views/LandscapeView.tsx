'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { CompetitorsEyeView } from '@/components/views/CompetitorsEyeView';
import { MarketResearchPanel } from '@/components/market-research/MarketResearchPanel';
import { Binoculars, TrendingUp } from 'lucide-react';

export function LandscapeView() {
  const [tab, setTab] = useState('competitors');

  return (
    <ViewShell
      title="Landscape"
      description="Competitors, market research, and intelligence."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="competitors" className="gap-1.5">
            <Binoculars className="h-3.5 w-3.5" /> Competitors
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Market Research
          </TabsTrigger>
        </TabsList>
        <TabsContent value="competitors" className="mt-4">
          <CompetitorsEyeView embedded />
        </TabsContent>
        <TabsContent value="research" className="mt-4">
          <MarketResearchPanel />
        </TabsContent>
      </Tabs>
    </ViewShell>
  );
}
