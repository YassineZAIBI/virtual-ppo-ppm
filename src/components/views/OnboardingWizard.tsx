'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Bot, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { IntegrationStep } from '@/components/onboarding/IntegrationStep';
import { SyncStep } from '@/components/onboarding/SyncStep';
import { CompletionStep } from '@/components/onboarding/CompletionStep';
import { KnowledgeUploader } from '@/components/knowledge/KnowledgeUploader';

const STEPS = [
  { id: 0, title: 'Welcome', description: 'Get started with Virtual PPO' },
  { id: 1, title: 'Jira', description: 'Connect your Jira instance' },
  { id: 2, title: 'Confluence', description: 'Connect your Confluence wiki' },
  { id: 3, title: 'Slack', description: 'Connect your Slack workspace' },
  { id: 4, title: 'Sync', description: 'Import existing data' },
  { id: 5, title: 'Context', description: 'Add knowledge sources' },
  { id: 6, title: 'Complete', description: 'You\'re all set!' },
];

interface Credentials {
  jira: { url: string; email: string; apiToken: string };
  confluence: { url: string; email: string; apiToken: string };
  slack: { botToken: string; channelId: string };
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [credentials, setCredentials] = useState<Credentials>({
    jira: { url: '', email: '', apiToken: '' },
    confluence: { url: '', email: '', apiToken: '' },
    slack: { botToken: '', channelId: '' },
  });
  const [connected, setConnected] = useState({
    jira: false,
    confluence: false,
    slack: false,
  });
  const [syncResults, setSyncResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved progress
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (data.completed) {
          router.push('/');
          return;
        }
        if (data.currentStep > 0) {
          setCurrentStep(data.currentStep);
        }
        setConnected({
          jira: data.jiraConnected || false,
          confluence: data.confluenceConnected || false,
          slack: data.slackConnected || false,
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [router]);

  const saveProgress = async (step: number, extra?: Record<string, any>) => {
    try {
      await fetch('/api/onboarding/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: step, ...extra }),
      });
    } catch {
      // Non-critical
    }
  };

  const handleNext = () => {
    const next = currentStep + 1;
    setCurrentStep(next);
    saveProgress(next);
  };

  const handleBack = () => {
    const prev = Math.max(0, currentStep - 1);
    setCurrentStep(prev);
    saveProgress(prev);
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      toast.success('Setup complete! Welcome to Virtual PPO.');
      router.push('/');
    } catch {
      toast.error('Failed to complete setup');
    }
  };

  const handleConnectionSuccess = (type: 'jira' | 'confluence' | 'slack') => {
    setConnected(prev => ({ ...prev, [type]: true }));
    saveProgress(currentStep, { [`${type}Connected`]: true });
  };

  const progress = (currentStep / (STEPS.length - 1)) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Bot className="h-10 w-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Virtual PPO</h1>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mb-8">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep
                  ? 'text-blue-600'
                  : step.id < currentStep
                  ? 'text-green-600'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                  step.id === currentStep
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : step.id < currentStep
                    ? 'border-green-600 bg-green-50 dark:bg-green-950'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {step.id < currentStep ? '\u2713' : step.id + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {currentStep === 0 && <WelcomeStep />}

            {currentStep === 1 && (
              <IntegrationStep
                type="jira"
                title="Connect Jira"
                description="Link your Jira instance to import projects and issues as initiatives."
                fields={[
                  { key: 'url', label: 'Jira URL', placeholder: 'https://your-domain.atlassian.net', type: 'text' },
                  { key: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email' },
                  { key: 'apiToken', label: 'API Token', placeholder: 'Your Jira API token', type: 'password' },
                ]}
                credentials={credentials.jira}
                onCredentialsChange={(creds) => setCredentials(prev => ({ ...prev, jira: { ...prev.jira, ...creds } }))}
                isConnected={connected.jira}
                onConnectionSuccess={() => handleConnectionSuccess('jira')}
              />
            )}

            {currentStep === 2 && (
              <IntegrationStep
                type="confluence"
                title="Connect Confluence"
                description="Link your Confluence wiki to import documentation and pages."
                fields={[
                  { key: 'url', label: 'Confluence URL', placeholder: 'https://your-domain.atlassian.net', type: 'text' },
                  { key: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email' },
                  { key: 'apiToken', label: 'API Token', placeholder: 'Your Confluence API token', type: 'password' },
                ]}
                credentials={credentials.confluence}
                onCredentialsChange={(creds) => setCredentials(prev => ({ ...prev, confluence: { ...prev.confluence, ...creds } }))}
                isConnected={connected.confluence}
                onConnectionSuccess={() => handleConnectionSuccess('confluence')}
              />
            )}

            {currentStep === 3 && (
              <IntegrationStep
                type="slack"
                title="Connect Slack"
                description="Link your Slack workspace to analyze channel discussions."
                fields={[
                  { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-your-bot-token', type: 'password' },
                  { key: 'channelId', label: 'Channel ID', placeholder: 'C01ABCDEF', type: 'text' },
                ]}
                credentials={credentials.slack}
                onCredentialsChange={(creds) => setCredentials(prev => ({ ...prev, slack: { ...prev.slack, ...creds } }))}
                isConnected={connected.slack}
                onConnectionSuccess={() => handleConnectionSuccess('slack')}
              />
            )}

            {currentStep === 4 && (
              <SyncStep
                credentials={credentials}
                connected={connected}
                onSyncComplete={(results) => setSyncResults(results)}
              />
            )}

            {currentStep === 5 && (
              <KnowledgeUploader />
            )}

            {currentStep === 6 && (
              <CompletionStep
                connected={connected}
                syncResults={syncResults}
                onComplete={handleComplete}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && currentStep <= 5 && (
              <Button variant="ghost" onClick={handleSkip} className="gap-2">
                Skip <SkipForward className="h-4 w-4" />
              </Button>
            )}

            {currentStep < 6 && (
              <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {currentStep >= 4 ? 'Continue' : 'Next'} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
