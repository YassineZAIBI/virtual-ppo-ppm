'use client';

import { Briefcase, Link2, Sparkles, Shield } from 'lucide-react';

export function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to Azmyra</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Your AI-powered Product Owner assistant. Let&apos;s get you set up in just a few steps.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
          <Link2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Connect Integrations</h3>
            <p className="text-sm text-slate-500">Link Jira, Confluence, and Slack to centralize your workflow.</p>
          </div>
        </div>

        <div className="flex gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
          <Sparkles className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">AI-Powered Sync</h3>
            <p className="text-sm text-slate-500">Automatically import and categorize your existing work.</p>
          </div>
        </div>

        <div className="flex gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950">
          <Briefcase className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Manage Products</h3>
            <p className="text-sm text-slate-500">Track initiatives, roadmaps, risks, and stakeholder communications.</p>
          </div>
        </div>

        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950">
          <Shield className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Your Data, Your Control</h3>
            <p className="text-sm text-slate-500">All credentials are encrypted. Skip any integration you don&apos;t need.</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        All integrations are optional. You can always configure them later in Settings.
      </p>
    </div>
  );
}
