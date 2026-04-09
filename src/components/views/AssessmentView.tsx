'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { RiskCenterView } from '@/components/views/RiskCenterView';
import { EvaluatorView } from '@/components/views/EvaluatorView';
import { DiscoveryView } from '@/components/views/DiscoveryView';
import { ShieldAlert, Gauge, Search } from 'lucide-react';
import { Suspense } from 'react';

export function AssessmentView() {
  const [tab, setTab] = useState('risks');

  return (
    <ViewShell
      title="Assessment"
      description="Risks, strategy evaluation, and discovery."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="risks" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Risks
          </TabsTrigger>
          <TabsTrigger value="evaluator" className="gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> Evaluator
          </TabsTrigger>
          <TabsTrigger value="discovery" className="gap-1.5">
            <Search className="h-3.5 w-3.5" /> Discovery
          </TabsTrigger>
        </TabsList>
        <TabsContent value="risks" className="mt-4">
          <RiskCenterView embedded />
        </TabsContent>
        <TabsContent value="evaluator" className="mt-4">
          <EvaluatorView embedded />
        </TabsContent>
        <TabsContent value="discovery" className="mt-4">
          <Suspense>
            <DiscoveryView embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ViewShell>
  );
}
