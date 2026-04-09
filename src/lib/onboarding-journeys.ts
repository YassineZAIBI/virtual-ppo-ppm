import type { OnboardingRole } from './types';

export const journeySteps: Record<OnboardingRole, string[]> = {
  solo: [
    'role-selection',
    'first-product',
    'ai-backfill',
    'integrations',
    'completion',
  ],
  head: [
    'role-selection',
    'integrations',
    'ai-organize',
    'north-star',
    'completion',
  ],
  vp: [
    'role-selection',
    'company-info',
    'north-star',
    'personas',
    'verticals',
    'integrations',
    'competitors',
    'completion',
  ],
  explore: [
    'role-selection',
    'quick-tour',
    'completion',
  ],
};

export function getJourney(role: OnboardingRole): { steps: string[]; total: number } {
  const steps = journeySteps[role];
  return { steps, total: steps.length };
}

export function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    'role-selection': 'About you',
    'first-product': 'Your product',
    'ai-backfill': 'AI setup',
    'ai-organize': 'AI organization',
    'integrations': 'Connect tools',
    'company-info': 'Company info',
    'north-star': 'Vision',
    'personas': 'Audiences',
    'verticals': 'Product lines',
    'competitors': 'Competitors',
    'quick-tour': 'Quick tour',
    'completion': 'Ready',
  };
  return labels[step] || step;
}
