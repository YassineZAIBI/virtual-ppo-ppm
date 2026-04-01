'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IntegrationConnectionData, IntegrationConfig } from '@/lib/types';

const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  {
    type: 'notion',
    name: 'Notion',
    description: 'Import pages and databases into your company brain',
    icon: 'N',
    docsUrl: 'https://www.notion.so/my-integrations',
    fields: [
      {
        key: 'notionAccessToken',
        label: 'Internal integration token',
        placeholder: 'secret_...',
        type: 'password',
        required: true,
        helpText: 'Create an internal integration at notion.so/my-integrations',
      },
    ],
  },
  {
    type: 'linear',
    name: 'Linear',
    description: 'Sync issues, create tickets, track cycles',
    icon: 'L',
    docsUrl: 'https://linear.app/settings/api',
    fields: [
      {
        key: 'linearApiKey',
        label: 'Personal API key',
        placeholder: 'lin_api_...',
        type: 'password',
        required: true,
        helpText: 'Generate at linear.app/settings/api',
      },
    ],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: 'Link initiatives to repos, PRs, and releases',
    icon: 'G',
    docsUrl: 'https://github.com/settings/tokens',
    fields: [
      {
        key: 'githubAccessToken',
        label: 'Personal access token',
        placeholder: 'ghp_...',
        type: 'password',
        required: true,
        helpText: 'Create a PAT with repo scope at github.com/settings/tokens',
      },
      {
        key: 'githubOrgName',
        label: 'Organization name (optional)',
        placeholder: 'my-org',
        type: 'text',
        required: false,
        helpText: 'Leave blank to use personal repos',
      },
    ],
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Read and write issues, transitions, comments',
    icon: 'J',
    docsUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    fields: [
      {
        key: 'jiraUrl',
        label: 'Jira host URL',
        placeholder: 'https://yourcompany.atlassian.net',
        type: 'url',
        required: true,
      },
      {
        key: 'jiraEmail',
        label: 'Email',
        placeholder: 'you@company.com',
        type: 'text',
        required: true,
      },
      {
        key: 'jiraApiToken',
        label: 'API token',
        placeholder: 'ATATT3xF...',
        type: 'password',
        required: true,
        helpText: 'Create at id.atlassian.com/manage-profile/security/api-tokens',
      },
    ],
  },
  {
    type: 'mixpanel',
    name: 'Mixpanel',
    description: 'Import user behavior signals into Discovery agent',
    icon: 'M',
    docsUrl: 'https://mixpanel.com/settings/project',
    fields: [
      {
        key: 'mixpanelProjectId',
        label: 'Project ID',
        placeholder: '123456',
        type: 'text',
        required: true,
      },
      {
        key: 'mixpanelSecret',
        label: 'Project secret',
        placeholder: '...',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    type: 'amplitude',
    name: 'Amplitude',
    description: 'Import event data to understand user needs',
    icon: 'A',
    docsUrl: 'https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/',
    fields: [
      {
        key: 'amplitudeApiKey',
        label: 'API key',
        placeholder: '...',
        type: 'password',
        required: true,
      },
    ],
  },
];

export function IntegrationsHubView() {
  const [connections, setConnections] = useState<IntegrationConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/integrations/status');
      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections ?? []);
    } finally {
      setLoading(false);
    }
  }

  function getConnection(type: string): IntegrationConnectionData | undefined {
    return connections.find((c) => c.integrationType === type);
  }

  async function handleConnect(config: IntegrationConfig) {
    for (const field of config.fields.filter((f) => f.required)) {
      if (!formValues[field.key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType: config.type,
          credentials: formValues,
          displayName: config.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to connect');
        return;
      }

      toast.success(`${config.name} connected successfully`);

      // Fire-and-forget: ingest Notion pages into brain on first connect
      if (config.type === 'notion') {
        fetch('/api/integrations/notion/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '' }),
        }).catch(console.error);
        toast.info('Importing Notion pages into company brain...');
      }

      setActiveForm(null);
      setFormValues({});
      await fetchConnections();
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect(type: string, name: string) {
    if (!confirm(`Disconnect ${name}? Your credentials will be removed.`)) return;

    const res = await fetch('/api/integrations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrationType: type }),
    });

    if (res.ok) {
      toast.success(`${name} disconnected`);
      await fetchConnections();
    } else {
      toast.error('Failed to disconnect');
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools to enrich the company brain and enable agent actions
        </p>
      </div>

      <div className="grid gap-4">
        {INTEGRATION_CONFIGS.map((config) => {
          const connection = getConnection(config.type);
          const isConnected = connection?.status === 'connected';
          const isExpanded = activeForm === config.type;

          return (
            <Card key={config.type} className={cn(isConnected && 'border-green-200')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-bold">
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{config.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleDisconnect(config.type, config.name)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setActiveForm(isExpanded ? null : config.type);
                          setFormValues({});
                        }}
                      >
                        {isExpanded ? 'Cancel' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && !isConnected && (
                <CardContent>
                  <div className="space-y-3">
                    {config.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          type={field.type === 'password' ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="mt-1 h-8 text-sm"
                        />
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <a
                        href={config.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Get credentials &rarr;
                      </a>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleConnect(config)}
                        disabled={saving}
                      >
                        {saving ? 'Connecting...' : `Connect ${config.name}`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              {isConnected && connection?.lastSyncAt && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(connection.lastSyncAt).toLocaleDateString()}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
