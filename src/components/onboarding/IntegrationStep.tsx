'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Field {
  key: string;
  label: string;
  placeholder: string;
  type: string;
}

interface IntegrationStepProps {
  type: 'jira' | 'confluence' | 'slack';
  title: string;
  description: string;
  fields: Field[];
  credentials: Record<string, string>;
  onCredentialsChange: (creds: Record<string, string>) => void;
  isConnected: boolean;
  onConnectionSuccess: () => void;
}

export function IntegrationStep({
  type,
  title,
  description,
  fields,
  credentials,
  onCredentialsChange,
  isConnected,
  onConnectionSuccess,
}: IntegrationStepProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; details: string; preview?: any } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/onboarding/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, credentials }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast.success(data.details);
        onConnectionSuccess();
      } else {
        toast.error(data.details || 'Connection failed');
      }
    } catch {
      setTestResult({ success: false, details: 'Network error. Please try again.' });
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        {isConnected && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type={field.type}
              placeholder={field.placeholder}
              value={credentials[field.key] || ''}
              onChange={(e) => onCredentialsChange({ [field.key]: e.target.value })}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={handleTest}
        disabled={isTesting || fields.some(f => !credentials[f.key])}
        className="w-full gap-2"
        variant={isConnected ? 'outline' : 'default'}
      >
        {isTesting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Testing Connection...</>
        ) : isConnected ? (
          <><CheckCircle2 className="h-4 w-4" /> Re-test Connection</>
        ) : (
          <><Zap className="h-4 w-4" /> Test Connection</>
        )}
      </Button>

      {testResult && !testResult.success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{testResult.details}</span>
        </div>
      )}

      {testResult?.preview && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-sm">
          <p className="font-medium text-green-700 dark:text-green-300 mb-2">Preview:</p>
          {testResult.preview.projects && (
            <div className="space-y-1">
              {testResult.preview.projects.map((p: any) => (
                <div key={p.key} className="text-slate-600 dark:text-slate-400">
                  {p.key} - {p.name}
                </div>
              ))}
            </div>
          )}
          {testResult.preview.spaces && (
            <div className="space-y-1">
              {testResult.preview.spaces.map((s: any) => (
                <div key={s.key} className="text-slate-600 dark:text-slate-400">
                  {s.key} - {s.name}
                </div>
              ))}
            </div>
          )}
          {testResult.preview.channelName && (
            <div className="text-slate-600 dark:text-slate-400">
              #{testResult.preview.channelName} ({testResult.preview.memberCount} members)
              {testResult.preview.topic && <p className="text-xs mt-1">Topic: {testResult.preview.topic}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
