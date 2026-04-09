'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { getJourney, getStepLabel } from '@/lib/onboarding-journeys';
import type { OnboardingRole } from '@/lib/types';

// Step components
import { RoleSelectionStep } from '@/components/onboarding/RoleSelectionStep';
import { FirstProductStep } from '@/components/onboarding/FirstProductStep';
import { AIBackfillStep } from '@/components/onboarding/AIBackfillStep';
import { AIOrganizeStep } from '@/components/onboarding/AIOrganizeStep';
import { QuickTourStep } from '@/components/onboarding/QuickTourStep';
import { CompletionStep } from '@/components/onboarding/CompletionStep';
import { PersonasStep } from '@/components/onboarding/PersonasStep';
import { VerticalsStep } from '@/components/onboarding/VerticalsStep';
import { IdentityStep } from '@/components/onboarding/IdentityStep';
import { NorthStarStep } from '@/components/onboarding/NorthStarStep';
import { CompetitorsStep } from '@/components/onboarding/CompetitorsStep';
import { IntegrationStep } from '@/components/onboarding/IntegrationStep';
import { SyncStep } from '@/components/onboarding/SyncStep';

// Sub-steps within the integrations step
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

  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [integrationSubStep, setIntegrationSubStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Journey data passed between steps
  const [journeyData, setJourneyData] = useState<Record<string, string>>({});

  // State for reused existing steps (VP journey: company-info, north-star, competitors)
  const [identityData, setIdentityData] = useState({
    companyName: '',
    industry: '',
    website: '',
    description: '',
  });
  const [northStar, setNorthStar] = useState('');
  const [mission, setMission] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);

  // Integration state
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

  const journey = role ? getJourney(role) : null;
  const currentStepKey = journey ? journey.steps[currentStepIndex] : 'role-selection';

  // ── Lifecycle ──

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (data.completed) {
          router.push('/');
          return;
        }
        if (data.role && ['solo', 'head', 'vp', 'explore'].includes(data.role)) {
          setRole(data.role as OnboardingRole);
        }
        if (data.currentStep > 0) {
          setCurrentStepIndex(data.currentStep);
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

  const saveProgress = async (step: number, extra?: Record<string, unknown>) => {
    try {
      await fetch('/api/onboarding/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: step, role: role || undefined, ...extra }),
      });
    } catch {
      // Non-critical
    }
  };

  // ── Navigation ──

  const goNext = () => {
    if (currentStepKey === 'integrations' && integrationSubStep < INTEGRATION_SUB_STEPS.length - 1) {
      setIntegrationSubStep(prev => prev + 1);
      return;
    }
    if (journey && currentStepIndex < journey.total - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      setIntegrationSubStep(0);
      saveProgress(next);
    }
  };

  const goBack = () => {
    if (currentStepKey === 'integrations' && integrationSubStep > 0) {
      setIntegrationSubStep(prev => prev - 1);
      return;
    }
    if (currentStepIndex > 1) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      setIntegrationSubStep(0);
      saveProgress(prev);
    } else {
      // Back from first step after role → go back to role selection
      setRole(null);
      setCurrentStepIndex(0);
    }
  };

  const handleRoleSelect = async (selectedRole: OnboardingRole) => {
    setRole(selectedRole);
    setCurrentStepIndex(1);
    await saveProgress(1, { role: selectedRole });
  };

  const handleComplete = async () => {
    try {
      // Save any VP-journey accumulated data
      if (northStar || mission) {
        await fetch('/api/vision/north-star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ northStar, mission }),
        });
      }
      for (const comp of competitors) {
        await fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: comp.name, websiteUrl: comp.websiteUrl, discoverySource: comp.source }),
        });
      }

      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityData }),
      });

      await update();
      toast.success('Your Azmyra is ready! Welcome.');
    } catch {
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  const handleConnectionSuccess = (type: 'jira' | 'confluence' | 'slack') => {
    setConnected(prev => ({ ...prev, [type]: true }));
    saveProgress(currentStepIndex, { [`${type}Connected`]: true });
  };

  // ── Rendering ──

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const renderDots = () => {
    if (!journey) return null;
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {journey.steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              'h-2 rounded-full transition-all',
              i < currentStepIndex ? 'w-2 bg-green-500' :
              i === currentStepIndex ? 'w-6 bg-primary' :
              'w-2 bg-muted'
            )}
          />
        ))}
      </div>
    );
  };

  const renderStep = () => {
    if (!role) {
      return <RoleSelectionStep onSelect={handleRoleSelect} />;
    }

    switch (currentStepKey) {
      // Solo journey
      case 'first-product':
        return (
          <FirstProductStep onComplete={(data) => {
            setJourneyData(prev => ({ ...prev, ...data }));
            goNext();
          }} />
        );

      case 'ai-backfill':
        return (
          <AIBackfillStep
            initiativeTitle={journeyData.title || ''}
            initiativeDescription={journeyData.description || ''}
            onComplete={goNext}
          />
        );

      // Head journey
      case 'ai-organize':
        return <AIOrganizeStep onComplete={goNext} />;

      // Explore journey
      case 'quick-tour':
        return <QuickTourStep onComplete={goNext} />;

      // VP journey reusing existing steps
      case 'company-info':
        return (
          <IdentityStep
            data={identityData}
            onChange={(partial) => setIdentityData(prev => ({ ...prev, ...partial }))}
          />
        );

      case 'north-star':
        return (
          <NorthStarStep
            identityData={identityData}
            northStar={northStar}
            mission={mission}
            onNorthStarChange={setNorthStar}
            onMissionChange={setMission}
          />
        );

      case 'personas':
        return <PersonasStep onComplete={goNext} />;

      case 'verticals':
        return <VerticalsStep onComplete={goNext} />;

      case 'competitors':
        return (
          <CompetitorsStep
            identityData={identityData}
            competitors={competitors}
            onCompetitorsChange={setCompetitors}
          />
        );

      // Integrations step (shared by multiple journeys)
      case 'integrations':
        if (integrationSubStep === 0) {
          return (
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
          );
        }
        if (integrationSubStep === 1) {
          return (
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
          );
        }
        if (integrationSubStep === 2) {
          return (
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
          );
        }
        if (integrationSubStep === 3) {
          return (
            <SyncStep
              credentials={credentials}
              connected={connected}
              onSyncComplete={() => {}}
            />
          );
        }
        return null;

      // Completion — all journeys end here
      case 'completion':
        return <CompletionStep role={role} onComplete={handleComplete} />;

      default:
        return <div className="text-center text-muted-foreground">Unknown step: {currentStepKey}</div>;
    }
  };

  const isCompletion = currentStepKey === 'completion';
  // Steps with their own onComplete (auto-advance) don't need external Next button
  const selfAdvancingSteps = ['first-product', 'ai-backfill', 'ai-organize', 'personas', 'verticals', 'quick-tour'];
  const isSelfAdvancing = selfAdvancingSteps.includes(currentStepKey);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Azmyra</h1>
        </div>

        {/* Progress dots */}
        {renderDots()}

        {/* Step content */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation — hidden for role selection, completion, and self-advancing steps */}
        {role && !isCompletion && !isSelfAdvancing && currentStepKey !== 'role-selection' && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={goNext} className="gap-2">
                Skip <SkipForward className="h-4 w-4" />
              </Button>
              <Button onClick={goNext} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step label */}
        {role && !isCompletion && (
          <div className="text-center mt-4">
            <span className="text-xs text-muted-foreground">
              {getStepLabel(currentStepKey)} &middot; Step {currentStepIndex + 1} of {journey?.total || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
