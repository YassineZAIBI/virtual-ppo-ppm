'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, Calendar, Map, Search, AlertTriangle,
  Gauge, MessageSquare, ArrowRight, Globe, Workflow,
  Mail, Sparkles, Shield, Zap,
} from 'lucide-react';

const features = [
  {
    icon: Briefcase,
    title: 'Initiative Pipeline',
    description: 'Track ideas from inception to approval with a visual Kanban pipeline. AI auto-prioritizes based on business value.',
    color: 'blue',
  },
  {
    icon: Calendar,
    title: 'Meeting Intelligence',
    description: 'Upload transcripts or let AI attend your meetings. Get instant summaries, action items, and decisions.',
    color: 'green',
  },
  {
    icon: Map,
    title: 'Smart Roadmap',
    description: 'AI-generated roadmaps with dependency tracking, risk overlays, and timeline optimization.',
    color: 'purple',
  },
  {
    icon: Search,
    title: 'Discovery Engine',
    description: 'Conduct user research, market analysis, and impact assessments with AI-powered discovery tools.',
    color: 'indigo',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Monitor',
    description: 'Proactively identify and track risks across your portfolio. AI suggests mitigation strategies.',
    color: 'red',
  },
  {
    icon: Gauge,
    title: 'Value Meter',
    description: 'Measure and visualize the business value delivered by each initiative with real-time metrics.',
    color: 'amber',
  },
];

const integrations = [
  { icon: Workflow, name: 'Jira', description: 'Sync epics, stories, and sprints' },
  { icon: Globe, name: 'Confluence', description: 'Import and generate documentation' },
  { icon: MessageSquare, name: 'Slack', description: 'Notifications and AI interactions' },
  { icon: Mail, name: 'Email', description: 'Auto-draft stakeholder updates' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="font-bold text-xl">Azmyra</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              Log In
            </Button>
          </Link>
          <Link href="/auth/signin?register=true">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <Badge variant="secondary" className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Powered Product Management
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Your Autonomous
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {' '}AI Product Manager
          </span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Azmyra is an AI-powered assistant that manages your product pipeline,
          summarizes meetings, tracks risks, and generates roadmaps &mdash; so you can
          focus on strategy.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/auth/signin?register=true">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 h-12">
              Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline" className="text-lg px-8 h-12 border-slate-600 text-slate-200 hover:bg-slate-800">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span>SOC 2 Ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            <span>6 AI Agents</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Workflow className="h-4 w-4" />
            <span>Jira &amp; Slack Integration</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Six AI Agents Working for You</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Each feature is powered by a specialized AI agent that understands your product context.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Integrations Section */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Integrates With Your Stack</h2>
          <p className="text-slate-400 text-lg">Connect your existing tools and let Azmyra work alongside them.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div key={integration.name} className="text-center p-6 rounded-xl bg-slate-800/30 border border-slate-700 hover:border-slate-600 transition-colors">
                <Icon className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-1">{integration.name}</h3>
                <p className="text-sm text-slate-400">{integration.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl p-12 border border-blue-500/20">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Product Management?</h2>
          <p className="text-slate-300 mb-8 text-lg">
            Start free with sample data. No credit card required.
          </p>
          <Link href="/auth/signin?register=true">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 h-12">
              Create Free Account <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span>Azmyra</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Azmyra. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
