'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Plus, X, Target, Users, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface VisionBuildStepProps {
  identityData: {
    companyName: string;
    industry: string;
    description: string;
  };
  northStar: string;
  businessGoals: string[];
  targetGroups: string[];
  products: string[];
  onBusinessGoalsChange: (goals: string[]) => void;
  onTargetGroupsChange: (groups: string[]) => void;
  onProductsChange: (products: string[]) => void;
}

export function VisionBuildStep({
  identityData,
  northStar,
  businessGoals,
  targetGroups,
  products,
  onBusinessGoalsChange,
  onTargetGroupsChange,
  onProductsChange,
}: VisionBuildStepProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const { settings } = useAppStore();

  const handleGenerate = async () => {
    if (!settings?.llm?.apiKey) {
      toast.error('Please configure your LLM provider in Settings first.');
      return;
    }

    setGenerating(true);
    try {
      // Build sources from identity data + North Star
      const textParts: string[] = [];
      if (identityData.companyName) textParts.push(`Company: ${identityData.companyName}`);
      if (identityData.industry) textParts.push(`Industry: ${identityData.industry}`);
      if (identityData.description) textParts.push(`Description: ${identityData.description}`);
      if (northStar) textParts.push(`North Star: ${northStar}`);

      const sources = [{ type: 'text', content: textParts.join('\n') }];

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
        const proposed = data.proposed;
        // Map structured response to simple string arrays for onboarding
        if (proposed?.businessGoals?.length) {
          onBusinessGoalsChange(proposed.businessGoals.map((g: { title: string }) => g.title));
        }
        if (proposed?.targetGroups?.length) {
          onTargetGroupsChange(proposed.targetGroups.map((g: { name: string }) => g.name));
        }
        // Products aren't in the extract response — leave empty for user to fill
        setGenerated(true);
        toast.success('Vision pyramid draft generated!');
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || 'Generation failed — add items manually.');
      }
    } catch {
      toast.error('Failed to generate pyramid. Add items manually.');
    } finally {
      setGenerating(false);
    }
  };

  const addItem = (
    list: string[],
    setter: (items: string[]) => void,
    value: string,
    clearFn: (v: string) => void,
  ) => {
    if (!value.trim()) return;
    setter([...list, value.trim()]);
    clearFn('');
  };

  const removeItem = (list: string[], setter: (items: string[]) => void, index: number) => {
    setter(list.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Build your Vision Pyramid</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define your business goals, target audiences, and products.
        </p>
      </div>

      {!generated && (
        <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
          <Sparkles className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            AI can propose your pyramid based on your North Star and product info.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
            className="gap-2"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Pyramid</>
            )}
          </Button>
        </div>
      )}

      {generated && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>AI-generated draft. Edit, add, or remove items below.</span>
        </div>
      )}

      {/* Business Goals */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">Business Goals</span>
            <Badge variant="secondary" className="text-[10px]">{businessGoals.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {businessGoals.map((goal, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {goal}
                <button onClick={() => removeItem(businessGoals, onBusinessGoalsChange, i)} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a business goal..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(businessGoals, onBusinessGoalsChange, newGoal, setNewGoal)}
              className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={() => addItem(businessGoals, onBusinessGoalsChange, newGoal, setNewGoal)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Target Groups */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-sm">Target Groups</span>
            <Badge variant="secondary" className="text-[10px]">{targetGroups.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {targetGroups.map((group, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {group}
                <button onClick={() => removeItem(targetGroups, onTargetGroupsChange, i)} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a target group..."
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(targetGroups, onTargetGroupsChange, newGroup, setNewGroup)}
              className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={() => addItem(targetGroups, onTargetGroupsChange, newGroup, setNewGroup)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">Products / Features</span>
            <Badge variant="secondary" className="text-[10px]">{products.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {products.map((product, i) => (
              <Badge key={i} variant="outline" className="gap-1 py-1">
                {product}
                <button onClick={() => removeItem(products, onProductsChange, i)} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a product or feature..."
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(products, onProductsChange, newProduct, setNewProduct)}
              className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={() => addItem(products, onProductsChange, newProduct, setNewProduct)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
