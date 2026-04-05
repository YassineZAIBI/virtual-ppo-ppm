'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Shield, Loader2, Zap, Cpu, Database, Puzzle, ArrowRight, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { CronDashboard } from '@/components/settings/CronDashboard';
import { ConnectionStatusSummary } from '@/components/settings/ConnectionStatusSummary';
import { ConnectorManager } from '@/components/connectors/ConnectorManager';

const modelPlaceholders: Record<string, string> = {
  openai: 'gpt-4',
  anthropic: 'claude-sonnet-4-20250514',
  azure: 'gpt-4',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  'z-ai': 'gpt-4',
  ollama: 'llama3',
};

export function SettingsView() {
  const { settings, updateLLMConfig, updatePreferences } = useAppStore();
  const [activeTab, setActiveTab] = useState('llm');
  const [isTestingLLM, setIsTestingLLM] = useState(false);

  const testLLMConnection = async () => {
    setIsTestingLLM(true);
    try {
      const response = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.llm.provider,
          apiKey: settings.llm.apiKey,
          apiEndpoint: settings.llm.apiEndpoint,
          model: settings.llm.model,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`LLM connection successful! Provider: ${data.provider}, Model: ${data.model}`);
      } else {
        const data = await response.json();
        toast.error(`LLM connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Failed to test LLM connection');
    } finally {
      setIsTestingLLM(false);
    }
  };

  const needsEndpoint = ['azure', 'ollama', 'z-ai'].includes(settings.llm.provider);

  const endpointConfig: Record<string, { label: string; placeholder: string }> = {
    azure: { label: 'Azure Endpoint', placeholder: 'https://your-resource.openai.azure.com/' },
    ollama: { label: 'Ollama Endpoint', placeholder: 'http://localhost:11434' },
    'z-ai': { label: 'Z-AI Base URL', placeholder: 'https://api.z-ai.com/v1' },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your AI assistant and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="llm">LLM Provider</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="connectors">
            <Database className="h-3.5 w-3.5 mr-1" />Data Sources
          </TabsTrigger>
          <TabsTrigger value="autonomous">
            <Cpu className="h-3.5 w-3.5 mr-1" />Autonomous AI
          </TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />LLM Provider Configuration</CardTitle>
                  <CardDescription>Choose your preferred AI provider for the assistant</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={testLLMConnection}
                  disabled={isTestingLLM || !settings.llm.apiKey}
                >
                  {isTestingLLM ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={settings.llm.provider} onValueChange={(value) => updateLLMConfig({ provider: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4, GPT-4o)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                    <SelectItem value="z-ai">Z-AI</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.llm.apiKey}
                  onChange={(e) => updateLLMConfig({ apiKey: e.target.value })}
                  placeholder={settings.llm.provider === 'ollama' ? '(not required for Ollama)' : 'Enter your API key...'}
                />
              </div>

              {needsEndpoint && (
                <div className="space-y-2">
                  <Label>{endpointConfig[settings.llm.provider]?.label || 'API Endpoint'}</Label>
                  <Input
                    value={settings.llm.apiEndpoint || ''}
                    onChange={(e) => updateLLMConfig({ apiEndpoint: e.target.value })}
                    placeholder={endpointConfig[settings.llm.provider]?.placeholder || 'https://...'}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={settings.llm.model || ''}
                  onChange={(e) => updateLLMConfig({ model: e.target.value })}
                  placeholder={modelPlaceholders[settings.llm.provider] || 'gpt-4'}
                />
                <p className="text-xs text-muted-foreground">Leave empty to use the default model for the selected provider</p>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  API keys are stored securely. In production, they are encrypted server-side and never exposed to the browser.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Puzzle className="h-4 w-4" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect Notion, Linear, GitHub, Jira, Slack and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <ConnectionStatusSummary />
                <Button variant="outline" size="sm" asChild>
                  <a href="/integrations">
                    Manage integrations <ArrowRight className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectors" className="mt-4">
          <ConnectorManager />
        </TabsContent>

        <TabsContent value="autonomous" className="mt-4">
          <CronDashboard />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Autonomy Preferences</CardTitle>
              <CardDescription>Configure how autonomous the AI agents should be</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Autonomy Level</Label>
                <Select value={settings.preferences.autonomyLevel} onValueChange={(value) => updatePreferences({ autonomyLevel: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Autonomy - AI acts independently</SelectItem>
                    <SelectItem value="oversight">Oversight - AI proposes, you review</SelectItem>
                    <SelectItem value="advisory">Advisory - AI suggests, you decide</SelectItem>
                    <SelectItem value="manual">Manual - AI only assists on request</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {settings.preferences.autonomyLevel === 'full' && 'Agents will automatically execute all tool actions without asking for approval.'}
                  {settings.preferences.autonomyLevel === 'oversight' && 'Agents will analyze and propose actions, but wait for your approval before executing write operations.'}
                  {settings.preferences.autonomyLevel === 'advisory' && 'Agents will suggest what actions could be taken, but will not execute any tools.'}
                  {settings.preferences.autonomyLevel === 'manual' && 'Agents will only respond to direct questions. No tool execution.'}
                </p>
              </div>

              {/* Tool gating indicator */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tool Access at Current Level</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { tool: 'Jira Search', readOnly: true },
                    { tool: 'Jira Create', readOnly: false },
                    { tool: 'Confluence Search', readOnly: true },
                    { tool: 'Confluence Create', readOnly: false },
                    { tool: 'Slack Post', readOnly: false },
                    { tool: 'Email Send', readOnly: false },
                  ].map(({ tool, readOnly }) => {
                    const level = settings.preferences.autonomyLevel;
                    const auto = level === 'full' || (readOnly && level === 'oversight');
                    const gated = !readOnly && level === 'oversight';
                    const blocked = level === 'advisory' || level === 'manual';

                    return (
                      <div key={tool} className="flex items-center gap-2 text-xs">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          blocked ? 'bg-muted-foreground/30' :
                          gated ? 'bg-amber-400' :
                          'bg-green-500'
                        }`} />
                        <span className="text-muted-foreground">{tool}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 ml-auto">
                          {blocked ? 'off' : gated ? 'approval' : 'auto'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />
              <div className="space-y-4">
                {[
                  { label: 'Enable Notifications', desc: 'Receive alerts for important events', key: 'notificationsEnabled' as const },
                  { label: 'Auto-send Meeting Emails', desc: 'Automatically send follow-up emails after meetings (overrides autonomy level)', key: 'autoSendEmails' as const },
                  { label: 'Auto-create Jira Stories', desc: 'Automatically create stories from approved features (overrides autonomy level)', key: 'autoCreateJiraStories' as const },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between">
                    <div>
                      <Label>{pref.label}</Label>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>
                    <Switch
                      checked={settings.preferences[pref.key]}
                      onCheckedChange={(checked) => updatePreferences({ [pref.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-4 w-4" /> Portfolio Structure
              </CardTitle>
              <CardDescription>How do you structure your work?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Granularity</Label>
                <Select
                  value={settings.preferences.portfolioGranularity || 'all'}
                  onValueChange={(v) => updatePreferences({ portfolioGranularity: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Verticals → Initiatives → Ideas (full)</SelectItem>
                    <SelectItem value="verticals">Verticals → Initiatives (skip ideas)</SelectItem>
                    <SelectItem value="initiatives">Initiatives → Ideas (skip verticals)</SelectItem>
                    <SelectItem value="ideas">Just Ideas (flat list)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Terminology</Label>
                <p className="text-xs text-muted-foreground">Customize what you call each level</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Level 1</Label>
                    <Input
                      value={settings.preferences.portfolioTerminology?.vertical || 'Product Vertical'}
                      onChange={(e) => updatePreferences({
                        portfolioTerminology: {
                          ...(settings.preferences.portfolioTerminology || { vertical: 'Product Vertical', initiative: 'Initiative', idea: 'Idea' }),
                          vertical: e.target.value,
                        },
                      })}
                      placeholder="Product Vertical"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Level 2</Label>
                    <Input
                      value={settings.preferences.portfolioTerminology?.initiative || 'Initiative'}
                      onChange={(e) => updatePreferences({
                        portfolioTerminology: {
                          ...(settings.preferences.portfolioTerminology || { vertical: 'Product Vertical', initiative: 'Initiative', idea: 'Idea' }),
                          initiative: e.target.value,
                        },
                      })}
                      placeholder="Initiative"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Level 3</Label>
                    <Input
                      value={settings.preferences.portfolioTerminology?.idea || 'Idea'}
                      onChange={(e) => updatePreferences({
                        portfolioTerminology: {
                          ...(settings.preferences.portfolioTerminology || { vertical: 'Product Vertical', initiative: 'Initiative', idea: 'Idea' }),
                          idea: e.target.value,
                        },
                      })}
                      placeholder="Idea"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
