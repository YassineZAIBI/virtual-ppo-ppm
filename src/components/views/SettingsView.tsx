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
import { Bot, Shield, Activity, MessageSquare, FileText, Send, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';

const modelPlaceholders: Record<string, string> = {
  openai: 'gpt-4',
  anthropic: 'claude-sonnet-4-20250514',
  azure: 'gpt-4',
  gemini: 'gemini-2.0-flash',
  'z-ai': 'gpt-4',
  ollama: 'llama3',
};

export function SettingsView() {
  const { settings, updateLLMConfig, updateIntegrations, updatePreferences } = useAppStore();
  const [activeTab, setActiveTab] = useState('llm');
  const [isTesting, setIsTesting] = useState<string | null>(null);
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

  const testConnection = async (service: string) => {
    setIsTesting(service);
    try {
      const credentials = (settings.integrations as any)[service];
      const response = await fetch(`/api/integrations/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (response.ok) {
        const data = await response.json();
        const details = data.projectCount ? ` (${data.projectCount} projects found)` :
                        data.spaceCount ? ` (${data.spaceCount} spaces found)` :
                        data.channel ? ` (channel: ${data.channel})` : '';
        toast.success(`${service} connection successful!${details}`);
      } else {
        const data = await response.json();
        toast.error(`${service} connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      toast.error(`Failed to test ${service} connection`);
    } finally {
      setIsTesting(null);
    }
  };

  const needsEndpoint = ['azure', 'ollama', 'z-ai'].includes(settings.llm.provider);

  const endpointConfig: Record<string, { label: string; placeholder: string }> = {
    azure: { label: 'Azure Endpoint', placeholder: 'https://your-resource.openai.azure.com/' },
    ollama: { label: 'Ollama Endpoint', placeholder: 'http://localhost:11434' },
    'z-ai': { label: 'Z-AI Base URL', placeholder: 'https://api.z-ai.com/v1' },
  };

  const integrationConfigs = [
    {
      key: 'jira', title: 'Jira', icon: Activity,
      fields: [
        { label: 'Jira URL', key: 'url', placeholder: 'https://your-domain.atlassian.net' },
        { label: 'Email', key: 'email', placeholder: 'you@company.com' },
        { label: 'API Token', key: 'apiToken', type: 'password', placeholder: 'Your Jira API token' },
      ],
    },
    {
      key: 'slack', title: 'Slack', icon: MessageSquare,
      fields: [
        { label: 'Bot Token', key: 'botToken', type: 'password', placeholder: 'xoxb-...' },
        { label: 'Channel ID', key: 'channelId', placeholder: 'C0123456789' },
      ],
    },
    {
      key: 'confluence', title: 'Confluence', icon: FileText,
      fields: [
        { label: 'URL', key: 'url', placeholder: 'https://your-domain.atlassian.net/wiki' },
        { label: 'Email', key: 'email', placeholder: 'you@company.com' },
        { label: 'API Token', key: 'apiToken', type: 'password', placeholder: 'Your Confluence API token' },
      ],
    },
    {
      key: 'email', title: 'Email (SMTP)', icon: Send,
      fields: [
        { label: 'SMTP Host', key: 'smtpHost', placeholder: 'smtp.gmail.com' },
        { label: 'Port', key: 'smtpPort', type: 'number', placeholder: '587' },
        { label: 'Username', key: 'username', placeholder: 'your-email@gmail.com' },
        { label: 'Password', key: 'password', type: 'password', placeholder: 'App password' },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500">Configure your AI assistant and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="llm">LLM Provider</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
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
                <p className="text-xs text-slate-500">Leave empty to use the default model for the selected provider</p>
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
          {integrationConfigs.map((integration) => (
            <Card key={integration.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <integration.icon className="h-5 w-5" />{integration.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(settings.integrations as any)[integration.key].enabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnection(integration.key)}
                        disabled={isTesting === integration.key}
                      >
                        {isTesting === integration.key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Test
                      </Button>
                    )}
                    <Switch
                      checked={(settings.integrations as any)[integration.key].enabled}
                      onCheckedChange={(checked) => updateIntegrations({
                        [integration.key]: { ...(settings.integrations as any)[integration.key], enabled: checked }
                      })}
                    />
                  </div>
                </div>
              </CardHeader>
              {(settings.integrations as any)[integration.key].enabled && (
                <CardContent className="space-y-3">
                  {integration.fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={(field as any).type || 'text'}
                        value={(settings.integrations as any)[integration.key][field.key] || ''}
                        onChange={(e) => updateIntegrations({
                          [integration.key]: {
                            ...(settings.integrations as any)[integration.key],
                            [field.key]: (field as any).type === 'number' ? parseInt(e.target.value) || 0 : e.target.value,
                          }
                        })}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
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
                <p className="text-xs text-slate-500">
                  {settings.preferences.autonomyLevel === 'full' && 'Agents will automatically execute all tool actions without asking for approval.'}
                  {settings.preferences.autonomyLevel === 'oversight' && 'Agents will analyze and propose actions, but wait for your approval before executing write operations.'}
                  {settings.preferences.autonomyLevel === 'advisory' && 'Agents will suggest what actions could be taken, but will not execute any tools.'}
                  {settings.preferences.autonomyLevel === 'manual' && 'Agents will only respond to direct questions. No tool execution.'}
                </p>
              </div>

              {/* Tool gating indicator */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tool Access at Current Level</p>
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
                          blocked ? 'bg-slate-300' :
                          gated ? 'bg-amber-400' :
                          'bg-green-500'
                        }`} />
                        <span className="text-slate-600 dark:text-slate-400">{tool}</span>
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
                      <p className="text-xs text-slate-500">{pref.desc}</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
