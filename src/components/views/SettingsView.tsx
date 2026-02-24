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
import { Bot, Shield, Activity, MessageSquare, FileText, Send, Loader2, CheckCircle2, Zap, RefreshCw, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import type { JiraProject } from '@/lib/types';

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
  const { settings, updateLLMConfig, updateIntegrations, updatePreferences, initiatives, addInitiative, jiraProjectSchema, setJiraProjectSchema } = useAppStore();
  const [activeTab, setActiveTab] = useState('llm');
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDiscoveringSchema, setIsDiscoveringSchema] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('azmyra-jira-last-sync');
    return null;
  });

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

  const testJiraAndFetchProjects = async () => {
    setIsTesting('jira');
    try {
      const creds = settings.integrations.jira;
      const res = await fetch('/api/integrations/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: creds.url, email: creds.email, apiToken: creds.apiToken }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Jira connected! ${data.projectCount} projects found`);
        if (data.projects) setJiraProjects(data.projects);
        // Fetch full project list
        const projRes = await fetch(`/api/integrations/jira?action=projects&url=${encodeURIComponent(creds.url)}&email=${encodeURIComponent(creds.email)}&apiToken=${encodeURIComponent(creds.apiToken)}`);
        if (projRes.ok) {
          const projData = await projRes.json();
          if (projData.projects) setJiraProjects(projData.projects);
        }
      } else {
        const data = await res.json();
        toast.error(`Jira connection failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Failed to test Jira connection');
    } finally {
      setIsTesting(null);
    }
  };

  const handleJiraSync = async () => {
    const creds = settings.integrations.jira;
    if (!creds.projectKey) {
      toast.error('Please select a Jira project first');
      return;
    }
    setIsSyncing(true);
    try {
      // Fetch only strategic issue types: Initiative, Epic, Portfolio EPIC, Feature(s)
      // Exclude stories, tasks, bugs, tests, subtasks
      const strategicTypes = ['Initiative', 'Epic', 'Portfolio EPIC', 'Features', 'Feature'];
      const typeFilter = strategicTypes.map(t => `"${t}"`).join(', ');
      const jql = `project = "${creds.projectKey}" AND issuetype in (${typeFilter}) ORDER BY created DESC`;

      const res = await fetch(
        `/api/integrations/jira?action=issues&projectKey=${encodeURIComponent(creds.projectKey)}&url=${encodeURIComponent(creds.url)}&email=${encodeURIComponent(creds.email)}&apiToken=${encodeURIComponent(creds.apiToken)}&jql=${encodeURIComponent(jql)}`
      );
      if (!res.ok) throw new Error('Failed to fetch issues');
      const data = await res.json();
      const issues = data.issues || [];

      // Map Jira status to initiative status
      const statusMap: Record<string, 'idea' | 'discovery' | 'validation' | 'definition' | 'approved'> = {
        'to do': 'idea', 'open': 'idea', 'backlog': 'idea', 'new': 'idea',
        'parking lot': 'idea', 'selected for development': 'definition',
        'in progress': 'discovery', 'in review': 'validation', 'waiting': 'validation',
        'business case review': 'definition', 'ready for development': 'definition',
        'done': 'approved', 'closed': 'approved', 'resolved': 'approved',
        'cancelled': 'approved',
      };

      // Map Jira issue type to a display label
      const typeLabel = (t: string) => {
        const lower = t.toLowerCase();
        if (lower.includes('initiative')) return 'Initiative';
        if (lower.includes('epic')) return 'Epic';
        if (lower.includes('feature')) return 'Feature';
        return t;
      };

      let synced = 0;
      for (const issue of issues) {
        // Skip if already synced (matching jiraKey)
        if (initiatives.some((i) => i.jiraKey === issue.key)) continue;
        const jiraStatus = (issue.status || '').toLowerCase();
        addInitiative({
          id: crypto.randomUUID(),
          title: issue.summary || issue.key,
          description: issue.description || '',
          status: statusMap[jiraStatus] || 'idea',
          businessValue: 'medium',
          effort: 'medium',
          stakeholders: issue.assignee ? [issue.assignee] : [],
          createdAt: new Date(issue.created || Date.now()),
          updatedAt: new Date(issue.updated || Date.now()),
          tags: issue.labels || [],
          risks: [],
          dependencies: [],
          jiraKey: issue.key,
          jiraIssueType: typeLabel(issue.issueType || ''),
        });
        synced++;
      }
      const now = new Date().toLocaleString();
      setLastSyncTime(now);
      localStorage.setItem('azmyra-jira-last-sync', now);
      toast.success(`Synced ${synced} Epics/Features from ${creds.projectKey} (${issues.length - synced} already existed)`);
    } catch {
      toast.error('Failed to sync Jira issues');
    } finally {
      setIsSyncing(false);
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
          {/* Dedicated Jira Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />Jira
                </CardTitle>
                <div className="flex items-center gap-2">
                  {settings.integrations.jira.enabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={testJiraAndFetchProjects}
                      disabled={isTesting === 'jira'}
                    >
                      {isTesting === 'jira' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Test
                    </Button>
                  )}
                  <Switch
                    checked={settings.integrations.jira.enabled}
                    onCheckedChange={(checked) => updateIntegrations({
                      jira: { ...settings.integrations.jira, enabled: checked }
                    })}
                  />
                </div>
              </div>
            </CardHeader>
            {settings.integrations.jira.enabled && (
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Jira URL</Label>
                  <Input
                    value={settings.integrations.jira.url}
                    onChange={(e) => updateIntegrations({ jira: { ...settings.integrations.jira, url: e.target.value } })}
                    placeholder="https://your-domain.atlassian.net"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={settings.integrations.jira.email}
                    onChange={(e) => updateIntegrations({ jira: { ...settings.integrations.jira, email: e.target.value } })}
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">API Token</Label>
                  <Input
                    type="password"
                    value={settings.integrations.jira.apiToken}
                    onChange={(e) => updateIntegrations({ jira: { ...settings.integrations.jira, apiToken: e.target.value } })}
                    placeholder="Your Jira API token"
                  />
                </div>

                {/* Project Picker */}
                {jiraProjects.length > 0 && (
                  <div>
                    <Label className="text-xs">Project</Label>
                    <Select
                      value={settings.integrations.jira.projectKey || ''}
                      onValueChange={async (val) => {
                        updateIntegrations({ jira: { ...settings.integrations.jira, projectKey: val } });
                        // Auto-discover project schema
                        setIsDiscoveringSchema(true);
                        try {
                          const params = new URLSearchParams({
                            action: 'schema',
                            projectKey: val,
                            url: settings.integrations.jira.url,
                            email: settings.integrations.jira.email,
                            apiToken: settings.integrations.jira.apiToken,
                          });
                          const resp = await fetch(`/api/integrations/jira?${params}`);
                          if (resp.ok) {
                            const data = await resp.json();
                            setJiraProjectSchema(data.schema);
                            setShowHierarchy(true);
                            toast.success(`Discovered ${data.schema.issueTypes?.length || 0} issue types in ${val}`);
                          }
                        } catch (err: any) {
                          console.error('Schema discovery failed:', err);
                        } finally {
                          setIsDiscoveringSchema(false);
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a project to sync" />
                      </SelectTrigger>
                      <SelectContent>
                        {jiraProjects.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.key} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Project Hierarchy Display */}
                {jiraProjectSchema && settings.integrations.jira.projectKey && (
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setShowHierarchy(!showHierarchy)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors w-full"
                    >
                      {showHierarchy ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <GitBranch className="h-3.5 w-3.5" />
                      Project Hierarchy ({jiraProjectSchema.issueTypes?.length || 0} issue types)
                      {isDiscoveringSchema && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                    </button>
                    {showHierarchy && jiraProjectSchema.hierarchy && (
                      <div className="mt-2 ml-5 space-y-1">
                        {jiraProjectSchema.hierarchy.map((level: any, i: number) => (
                          <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${Math.max(0, (2 - level.level)) * 16}px` }}>
                            <span className="text-xs font-mono text-slate-400">L{level.level}</span>
                            <Badge variant="outline" className="text-xs">
                              {level.issueTypeNames.join(', ')}
                            </Badge>
                            {level.canContain.length > 0 && (
                              <span className="text-xs text-slate-400">→ contains: {level.canContain.join(', ')}</span>
                            )}
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Discovered: {new Date(jiraProjectSchema.discoveredAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sync Button */}
                {settings.integrations.jira.projectKey && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sync Issues</p>
                        {lastSyncTime && (
                          <p className="text-xs text-slate-500">Last synced: {lastSyncTime}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleJiraSync}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sync Now
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Imports Initiatives, Epics &amp; Features from <strong>{settings.integrations.jira.projectKey}</strong>. Stories, bugs and tasks are excluded.
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

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
