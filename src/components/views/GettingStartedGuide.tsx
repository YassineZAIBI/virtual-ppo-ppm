'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  LayoutDashboard, Lightbulb, Calendar, MessageSquare,
  Map, Settings, ArrowRight, FlaskConical, Info,
} from 'lucide-react';

const guideSteps = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Explore the Dashboard',
    badge: 'Start Here',
    badgeColor: 'bg-green-100 text-green-700 border-green-300',
    description:
      'The dashboard gives you a bird\'s-eye view of your product portfolio. You\'ll see active initiatives, pending approvals, risks, and upcoming meetings at a glance.',
    tips: [
      'Click on any stat card to navigate to the detailed view',
      'Use Quick Actions to generate PRDs, prepare interviews, or sync with Jira',
      'The "Items Requiring Your Attention" section highlights what needs your focus right now',
    ],
    navigateTo: '/',
    navigateLabel: 'Go to Dashboard',
  },
  {
    id: 'initiatives',
    icon: Lightbulb,
    title: 'Create Your First Initiative',
    badge: 'Core Feature',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
    description:
      'Initiatives flow through a Kanban pipeline: Ideas → Discovery → Validation → Definition → Approved. Each stage has specific activities and AI-powered tools.',
    tips: [
      'Click "New Idea" to submit an initiative with business case questions',
      'Drag initiatives between stages using the arrow button on each card',
      'Click any card to edit details, add tags, or update stakeholders',
      'Use the Discovery workspace (magnifying glass icon) for research on discovery-stage items',
    ],
    navigateTo: '/initiatives',
    navigateLabel: 'Go to Initiatives',
  },
  {
    id: 'meetings',
    icon: Calendar,
    title: 'Process a Meeting',
    badge: 'AI-Powered',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-300',
    description:
      'Upload meeting transcripts and let AI extract summaries, action items, decisions, and challenges. You can also send an AI agent to attend meetings on your behalf.',
    tips: [
      'Paste a meeting transcript and click "Analyze with AI" for instant insights',
      'The AI Agent can join Zoom/Google Meet links and take notes autonomously',
      'Click any meeting card to expand and see action items, decisions, and challenges',
    ],
    navigateTo: '/meetings',
    navigateLabel: 'Go to Meetings',
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'Talk to the AI Assistant',
    badge: 'AI-Powered',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-300',
    description:
      'The AI assistant understands your entire product context — initiatives, risks, meetings, and roadmap. Ask it anything about your product strategy.',
    tips: [
      'Ask "What are my top risks?" or "Summarize my initiatives"',
      'Request specific outputs like PRDs, competitive analyses, or stakeholder updates',
      'The assistant remembers your conversation history within a session',
    ],
    navigateTo: '/chat',
    navigateLabel: 'Go to AI Assistant',
  },
  {
    id: 'roadmap',
    icon: Map,
    title: 'Build Your Roadmap',
    badge: 'Visual',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    description:
      'Visualize your product roadmap with timeline views, dependency tracking, and risk overlays. AI can generate roadmap suggestions based on your initiatives.',
    tips: [
      'Roadmap items are linked to your initiatives for end-to-end traceability',
      'Use the timeline view to see how initiatives align across quarters',
      'AI can suggest optimal sequencing based on dependencies and business value',
    ],
    navigateTo: '/roadmap',
    navigateLabel: 'Go to Roadmap',
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Connect Your Tools',
    badge: 'Integrations',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description:
      'Configure your AI model, connect Jira for epic syncing, set up Slack notifications, and customize your Azmyra experience.',
    tips: [
      'Set your preferred LLM (OpenAI, Anthropic, etc.) in Settings → AI Configuration',
      'Connect Jira to sync epics and stories bi-directionally',
      'Enable Slack notifications to stay updated on initiative changes',
    ],
    navigateTo: '/settings',
    navigateLabel: 'Go to Settings',
  },
];

export function GettingStartedGuide() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Getting Started with Azmyra</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Learn how to use each feature and get the most out of your AI product manager.
        </p>
      </div>

      {/* Example Data Info */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FlaskConical className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">About Example Data</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                Your workspace is pre-loaded with example initiatives, meetings, and risks so you can explore the platform right away.
                Items tagged with <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1.5 py-0 mx-1"><FlaskConical className="h-2.5 w-2.5 mr-0.5 inline" />Example</Badge> are sample data.
                Feel free to modify or delete them as you add your own content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guide Steps */}
      <Accordion type="single" collapsible defaultValue="dashboard" className="space-y-3">
        {guideSteps.map((step) => {
          const Icon = step.icon;
          return (
            <AccordionItem key={step.id} value={step.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{step.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${step.badgeColor}`}>
                        {step.badge}
                      </Badge>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-12 space-y-3">
                  <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                  <div className="space-y-1.5">
                    {step.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push(step.navigateTo)}
                  >
                    {step.navigateLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
