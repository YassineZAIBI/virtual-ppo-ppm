'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, SkipForward, Eye, Sparkles, Target, Binoculars, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { IdentityStep } from '@/components/onboarding/IdentityStep';
import { NorthStarStep } from '@/components/onboarding/NorthStarStep';
import { VisionBuildStep } from '@/components/onboarding/VisionBuildStep';
import { CompetitorsStep } from '@/components/onboarding/CompetitorsStep';
import { IntegrationStep } from '@/components/onboarding/IntegrationStep';
import { SyncStep } from '@/components/onboarding/SyncStep';

const STEPS = [
  { id: 0, title: 'Identity', description: 'Tell us about your product', icon: Eye },
  { id: 1, title: 'North Star', description: 'Define your guiding metric', icon: Sparkles },
  { id: 2, title: 'Vision Build', description: 'Build your vision pyramid', icon: Target },
  { id: 3, title: 'Competitors', description: 'Identify competitors', icon: Binoculars },
  { id: 4, title: 'Integrations', description: 'Connect your tools', icon: Link2 },
];

// Sub-steps within Integrations (step 4)
const INTEGRATION_SUB_STEPS = ['jira', 'confluence', 'slack', 'sync'] as const;

interface Credentials {
  jira: { url: string; email: string; apiToken: string };
  confluence: { url: string; email: string; apiToken: string };
  slack: { botToken: string; channelId: string };
}

interface CompetitorEntry {
  name: string;
  websiteUrl: string;
  source: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [integrationSubStep, setIntegrationSubStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Step 1: Identity
  const [identityData, setIdentityData] = useState({
    companyName: '',
    industry: '',
    website: '',
    description: '',
  });

  // Step 2: North Star
  const [northStar, setNorthStar] = useState('');
  const [mission, setMission] = useState('');

  // Step 3: Vision Build
  const [businessGoals, setBusinessGoals] = useState<string[]>([]);
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);

  // Step 4: Competitors
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);

  // Step 5: Integrations
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

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (data.completed) {
          router.push('/');
          return;
        }
        if (data.currentStep > 0) {
          setCurrentStep(Math.min(data.currentStep, STEPS.length - 1));
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
    // If on integration step, cycle through sub-steps
    if (currentStep === 4 && integrationSubStep < INTEGRATION_SUB_STEPS.length - 1) {
      setIntegrationSubStep(integrationSubStep + 1);
      return;
    }

    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setIntegrationSubStep(0);
      saveProgress(next);
    }
  };

  const handleBack = () => {
    if (currentStep === 4 && integrationSubStep > 0) {
      setIntegrationSubStep(integrationSubStep - 1);
      return;
    }
    const prev = Math.max(0, currentStep - 1);
    setCurrentStep(prev);
    setIntegrationSubStep(0);
    saveProgress(prev);
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    try {
      // Save vision data
      if (northStar || mission) {
        await fetch('/api/vision/north-star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ northStar, mission }),
        });
      }

      // Save business goals
      for (const goal of businessGoals) {
        await fetch('/api/vision/business-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: goal }),
        });
      }

      // Save target groups
      for (const group of targetGroups) {
        await fetch('/api/vision/target-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: group }),
        });
      }

      // Save products
      for (const product of products) {
        await fetch('/api/vision/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: product }),
        });
      }

      // Save competitors
      for (const comp of competitors) {
        await fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: comp.name,
            websiteUrl: comp.websiteUrl,
            discoverySource: comp.source,
          }),
        });
      }

      // Mark onboarding complete + serialize company brain
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityData }),
      });
      await update();
      toast.success('Your Azmyra is ready! Welcome.');
      window.location.href = '/vision';
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

  const isLastStep = currentStep === STEPS.length - 1 && integrationSubStep === INTEGRATION_SUB_STEPS.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Azmyra 3.0</h1>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mb-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step.id === currentStep
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                      : step.id < currentStep
                      ? 'border-green-600 bg-green-50 dark:bg-green-500/10'
                      : 'border-slate-300 dark:border-border'
                  }`}
                >
                  {step.id < currentStep ? (
                    <span className="text-sm font-medium">&#10003;</span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {currentStep === 0 && (
              <IdentityStep
                data={identityData}
                onChange={(partial) => setIdentityData(prev => ({ ...prev, ...partial }))}
              />
            )}

            {currentStep === 1 && (
              <NorthStarStep
                identityData={identityData}
                northStar={northStar}
                mission={mission}
                onNorthStarChange={setNorthStar}
                onMissionChange={setMission}
              />
            )}

            {currentStep === 2 && (
              <VisionBuildStep
                identityData={identityData}
                northStar={northStar}
                businessGoals={businessGoals}
                targetGroups={targetGroups}
                products={products}
                onBusinessGoalsChange={setBusinessGoals}
                onTargetGroupsChange={setTargetGroups}
                onProductsChange={setProducts}
              />
            )}

            {currentStep === 3 && (
              <CompetitorsStep
                identityData={identityData}
                competitors={competitors}
                onCompetitorsChange={setCompetitors}
              />
            )}

            {currentStep === 4 && integrationSubStep === 0 && (
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

            {currentStep === 4 && integrationSubStep === 1 && (
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

            {currentStep === 4 && integrationSubStep === 2 && (
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

            {currentStep === 4 && integrationSubStep === 3 && (
              <SyncStep
                credentials={credentials}
                connected={connected}
                onSyncComplete={(results) => setSyncResults(results)}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 && integrationSubStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex gap-2">
            {currentStep >= 1 && (
              <Button variant="ghost" onClick={handleSkip} className="gap-2">
                Skip <SkipForward className="h-4 w-4" />
              </Button>
            )}

            {isLastStep ? (
              <Button onClick={handleComplete} className="gap-2 bg-green-600 hover:bg-green-700">
                Complete Setup <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
