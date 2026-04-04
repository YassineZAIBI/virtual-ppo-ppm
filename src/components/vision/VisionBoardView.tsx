'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { NorthStarComposer } from './NorthStarComposer';
import { VisionPyramid } from './VisionPyramid';
import { VisionPreviewModal } from './VisionPreviewModal';
import { AlignmentBadge } from './AlignmentBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Eye, Target, Users, AlertTriangle, Package, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type {
  NorthStarData,
  BusinessGoalData,
  TargetGroupData,
  NeedData,
  ProductMappingData,
} from '@/lib/types';

export function VisionBoardView() {
  const {
    visionPyramid,
    visionLoading,
    setVisionLoading,
    setNorthStar,
    setBusinessGoals,
    setTargetGroups,
    setNeeds,
    setProducts,
    setVisionComplete,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { settings } = useAppStore();

  const fetchPyramid = useCallback(async () => {
    setVisionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vision/pyramid');
      if (!res.ok) throw new Error('Failed to fetch vision data');
      const data = await res.json();

      setNorthStar(data.northStar ?? null);
      setVisionComplete(data.visionComplete ?? false);

      // Flatten the nested structure from the pyramid API
      const goals: BusinessGoalData[] = data.businessGoals ?? [];
      const groups: TargetGroupData[] = [];
      const allNeeds: NeedData[] = [];
      const allProducts: ProductMappingData[] = [];

      for (const goal of goals) {
        if (goal.targetGroups) {
          for (const group of goal.targetGroups) {
            groups.push(group);
            if (group.needs) {
              for (const need of group.needs) {
                allNeeds.push(need);
                if (need.products) {
                  allProducts.push(...need.products);
                }
              }
            }
          }
        }
      }

      setBusinessGoals(goals);
      setTargetGroups(groups);
      setNeeds(allNeeds);
      setProducts(allProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setVisionLoading(false);
    }
  }, [setVisionLoading, setNorthStar, setVisionComplete, setBusinessGoals, setTargetGroups, setNeeds, setProducts]);

  useEffect(() => {
    fetchPyramid();
  }, [fetchPyramid]);

  const { northStar, businessGoals, targetGroups, needs, products, visionComplete } = visionPyramid;

  // Compute completion progress
  const steps = [
    !!northStar,
    businessGoals.length > 0,
    targetGroups.length > 0,
    needs.length > 0,
    products.length > 0,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);

  const handleGeneratePreview = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/vision/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Generate a product vision',
          company: '',
          llmConfig: {
            provider: settings.llm.provider,
            apiKey: settings.llm.apiKey,
            model: settings.llm.model,
            apiEndpoint: settings.llm.apiEndpoint,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate preview');
      }
      const { preview } = await res.json();
      setPreviewData(preview);
      setShowPreview(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate vision preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmPreview = async (edited: any) => {
    setConfirming(true);
    try {
      // 1. Save North Star
      const nsRes = await fetch('/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: edited.northStar }),
      });
      if (!nsRes.ok) throw new Error('Failed to save North Star');
      const savedNS = await nsRes.json();

      // 2. Save Business Goals
      for (const goal of edited.goals) {
        if (!goal.title?.trim()) continue;
        await fetch('/api/vision/business-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            northStarId: savedNS.id,
            title: goal.title,
            description: goal.description || '',
            metric: goal.metric || '',
            targetAudiences: edited.targetGroups?.map((g: any) => ({
              name: g.name,
              description: g.description,
              role: g.role,
            })),
          }),
        });
      }

      // 3. Save Target Groups (if not already created via business-goals sync)
      for (const group of edited.targetGroups) {
        if (!group.name?.trim()) continue;
        await fetch('/api/vision/target-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: group.name,
            description: group.description || '',
            role: group.role || '',
            source: 'ai_generated',
          }),
        });
      }

      setShowPreview(false);
      setPreviewData(null);
      toast.success('Vision Board generated!');
      fetchPyramid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save vision');
    } finally {
      setConfirming(false);
    }
  };

  if (visionLoading && !northStar) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-indigo-500" />
            Vision Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define your product vision from North Star to products
          </p>
        </div>
        <div className="flex items-center gap-3">
          {visionComplete && (
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              Vision Complete
            </Badge>
          )}
          {!northStar && (
            <Button size="sm" onClick={handleGeneratePreview} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate with AI
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchPyramid} disabled={visionLoading}>
            {visionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Vision Completeness</span>
            <span className="text-sm text-muted-foreground">{completedSteps}/5 layers</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span className={northStar ? 'text-amber-500 font-medium' : ''}>North Star</span>
            <span className={businessGoals.length > 0 ? 'text-teal-500 font-medium' : ''}>Goals ({businessGoals.length})</span>
            <span className={targetGroups.length > 0 ? 'text-purple-500 font-medium' : ''}>Groups ({targetGroups.length})</span>
            <span className={needs.length > 0 ? 'text-amber-500 font-medium' : ''}>Needs ({needs.length})</span>
            <span className={products.length > 0 ? 'text-blue-500 font-medium' : ''}>Products ({products.length})</span>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPyramid}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {/* North Star Composer */}
      <NorthStarComposer northStar={northStar} onSaved={fetchPyramid} />

      {/* Vision Pyramid */}
      <VisionPyramid
        northStar={northStar}
        businessGoals={businessGoals}
        targetGroups={targetGroups}
        needs={needs}
        products={products}
        onRefresh={fetchPyramid}
      />

      {/* Quick Stats */}
      {northStar && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Target className="h-5 w-5 mx-auto text-teal-500 mb-1" />
              <p className="text-lg font-bold">{businessGoals.length}</p>
              <p className="text-[10px] text-muted-foreground">Goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Users className="h-5 w-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{targetGroups.length}</p>
              <p className="text-[10px] text-muted-foreground">Groups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold">{needs.length}</p>
              <p className="text-[10px] text-muted-foreground">Needs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Package className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{products.length}</p>
              <p className="text-[10px] text-muted-foreground">Products</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vision Preview Modal */}
      {showPreview && previewData && (
        <VisionPreviewModal
          open={showPreview}
          onClose={() => { setShowPreview(false); setPreviewData(null); }}
          preview={previewData}
          onConfirm={handleConfirmPreview}
          confirming={confirming}
        />
      )}
    </div>
  );
}
