'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Brain, Briefcase, Calendar, Search,
  AlertTriangle, Gauge, ChevronDown, Check, X,
  Bot, Shield, Lightbulb, MessageSquare, Eye, Zap,
  Rocket, Users, Building2, Sparkles, ShieldAlert,
  Binoculars, Package, TrendingUp,
} from 'lucide-react';

/* ── scroll-reveal hook ─────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const els = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const ob = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const delay = Number(e.target.getAttribute('data-delay') || 0);
            setTimeout(() => e.target.classList.add('revealed'), delay);
            ob.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => ob.observe(el));
    return () => ob.disconnect();
  }, []);

  return ref;
}

/* ── sticky nav scroll detection ─────────────────────────── */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

/* ── data ────────────────────────────────────────────────── */
const PAIN_POINTS = [
  { title: 'Scattered tools', desc: 'Your roadmap is in one tool, backlog in another, research in a spreadsheet, and risks in someone\'s head.', icon: X },
  { title: 'Misaligned teams', desc: 'Engineering builds features that don\'t match the vision. No one knows the big picture.', icon: X },
  { title: 'Flying blind', desc: 'You can\'t answer "are we building the right thing?" without 3 hours of digging.', icon: X },
];

const STEPS = [
  { step: '01', title: 'Define your vision', desc: 'Tell us what you\'re building. We\'ll set up your north star, goals, and personas.', label: 'Onboarding' },
  { step: '02', title: 'AI organizes your work', desc: 'Our agents structure your backlog, score alignment, and flag risks automatically.', label: 'Portfolio view' },
  { step: '03', title: 'See the big picture', desc: 'Your Company Brain shows everything connected — vision to execution.', label: 'Brain canvas' },
];

const FEATURES = [
  { id: 'brain', icon: Brain, title: 'Company Brain', desc: 'See your entire product strategy as an interactive canvas. Vision, verticals, risks, competitors — all connected.', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'portfolio', icon: Briefcase, title: 'Portfolio & Roadmap', desc: 'Organize initiatives into verticals with visual timelines and dependency tracking. Alignment scoring shows what serves your vision — and what doesn\'t.', gradient: 'from-purple-500 to-violet-400' },
  { id: 'meetings', icon: Calendar, title: 'Meeting Intelligence', desc: 'AI will attend your meetings, extract summaries, decisions, and action items. Never lose context from a conversation again.', gradient: 'from-green-500 to-emerald-400', comingSoon: true },
  { id: 'risks', icon: AlertTriangle, title: 'Risk Monitor', desc: 'Proactive risk detection. AI assesses threats, suggests mitigations, and links risks to the initiatives they endanger.', gradient: 'from-rose-500 to-pink-400' },
  { id: 'discovery', icon: Search, title: 'Discovery Engine', desc: 'Market research across 24 data sources. Competitor monitoring every 6 hours. Intelligence that feeds directly into your strategy.', gradient: 'from-indigo-500 to-blue-400' },
  { id: 'value', icon: Gauge, title: 'Value Meter', desc: 'Track business value per initiative. Know which work delivers ROI and which is strategic debt.', gradient: 'from-amber-500 to-yellow-400' },
];

const PERSONAS = [
  { role: 'solo', icon: Rocket, title: 'Solo PM at a startup', quote: 'I need speed. AI does the strategic work so I can focus on building.', time: '3 minutes', color: 'from-blue-500 to-cyan-400' },
  { role: 'head', icon: Users, title: 'Head of Product', quote: 'I need clarity across products. Show me what\'s aligned and what\'s drifting.', time: '10 minutes', color: 'from-purple-500 to-violet-400' },
  { role: 'vp', icon: Building2, title: 'VP / Director', quote: 'I need governance. Compliance, alignment, and cross-team visibility.', time: '15 minutes', color: 'from-rose-500 to-pink-400' },
];

const AGENTS = [
  { icon: Brain, name: 'Strategy Agent', desc: 'Scores alignment, detects drift, reviews your portfolio weekly' },
  { icon: Search, name: 'Discovery Agent', desc: 'Scouts market data from 24 sources, monitors competitors' },
  { icon: Shield, name: 'Risk Agent', desc: 'Watches for threats, creates mitigation plans, escalates to you' },
  { icon: MessageSquare, name: 'Communications Agent', desc: 'Drafts stakeholder updates, summarizes meetings, sends notifications' },
  { icon: Lightbulb, name: 'Expert Advisor', desc: 'Consults PM best practices, recommends frameworks, coaches your team' },
  { icon: Eye, name: 'Thinker Agent', desc: 'Finds hidden patterns, runs "what if" scenarios, connects the dots' },
];

const INTEGRATIONS = [
  { name: 'Jira', soon: false },
  { name: 'Confluence', soon: false },
  { name: 'Slack', soon: false },
  { name: 'Notion', soon: false },
  { name: 'Linear', soon: false },
  { name: 'GitHub', soon: false },
  { name: 'Email', soon: false },
];

const COMPARISON = [
  { feature: 'AI agents', azmyra: '6 specialized', pb: 'Bolt-on AI', jira: 'None' },
  { feature: 'Strategy canvas', azmyra: true, pb: false, jira: false },
  { feature: 'Alignment scoring', azmyra: 'Automatic', pb: 'Manual', jira: false },
  { feature: 'Risk monitoring', azmyra: 'Proactive AI', pb: false, jira: false },
  { feature: 'Meeting intelligence', azmyra: true, pb: false, jira: false },
  { feature: 'Market research', azmyra: '24 adapters', pb: 'Basic', jira: false },
  { feature: 'Price', azmyra: 'Free to start', pb: 'From $20/maker', jira: 'From $10/user' },
];

const FAQ = [
  { q: 'Is my data safe?', a: 'Yes. All data is encrypted at rest and in transit. We use AES-256-GCM for credentials. Your LLM API keys never leave your instance.' },
  { q: 'Do I need to bring my own LLM?', a: 'Yes, currently you connect your own OpenAI, Anthropic, or Groq API key. We\'re working on a hosted option.' },
  { q: 'Can I import my existing Jira backlog?', a: 'Yes. Connect Jira in Settings and our AI will organize your issues into verticals automatically.' },
  { q: 'How is this different from Productboard?', a: 'Productboard is a feedback tool with bolt-on AI. Azmyra is AI-native — 6 specialized agents that understand your product and work autonomously.' },
  { q: 'Is there a mobile app?', a: 'Not yet. The web app is fully responsive. Native mobile is on the roadmap.' },
];

/* ── sub-components ──────────────────────────────────────── */

/* Shared wrapper for all illustrations */
function IllustrationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-[#0c1222] rounded-2xl border border-white/10 overflow-hidden p-4 sm:p-5">
      <style>{`
        @keyframes ill-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ill-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes ill-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes ill-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .ill-card { animation: ill-fade 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .ill-fl { animation: ill-float 4s ease-in-out infinite; }
      `}</style>
      {/* Faux window bar */}
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
          <div className="h-2 w-2 rounded-full bg-green-500/60" />
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Onboarding Role Selection ─────────────────────────────── */
function OnboardingIllustration() {
  const roles = [
    { title: 'Solo PM', time: '~3 min', color: 'border-l-blue-500', icon: Rocket, desc: 'Start with your product, AI fills in strategy' },
    { title: 'Head of Product', time: '~10 min', color: 'border-l-purple-500', icon: Users, desc: 'Import your tools, AI organizes everything' },
    { title: 'VP / Director', time: '~15 min', color: 'border-l-rose-500', icon: Building2, desc: 'Define vision top-down, build the full picture' },
    { title: 'Just exploring', time: '~1 min', color: 'border-l-slate-400', icon: Eye, desc: 'Quick tour of features, dive in later' },
  ];
  return (
    <IllustrationShell>
      <div className="max-w-xs mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <div className="h-2 w-6 rounded-full bg-blue-500" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
        </div>
        <p className="text-[11px] font-semibold text-white/80 text-center mb-3">What best describes you?</p>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className={`ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] ${r.color} border-l-2 p-2.5 ${i === 0 ? 'ring-1 ring-blue-500/40 bg-blue-500/5' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3 text-slate-400" />
                  <span className="text-[9px] font-semibold text-white/80">{r.title}</span>
                </div>
                <p className="text-[8px] text-slate-500 leading-relaxed">{r.desc}</p>
                <span className="text-[7px] text-slate-600 mt-1 block">{r.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </IllustrationShell>
  );
}

/* ── Portfolio / Kanban Pipeline ───────────────────────────── */
function PortfolioIllustration() {
  const columns = [
    { title: 'Ideas', color: 'bg-gray-400', items: ['User feedback portal', 'Dark mode'] },
    { title: 'Discovery', color: 'bg-amber-500', items: ['API v3 redesign'] },
    { title: 'Validation', color: 'bg-blue-400', items: ['SSO integration', 'Mobile app'] },
    { title: 'Definition', color: 'bg-blue-500', items: ['AI chat v2'] },
    { title: 'Approved', color: 'bg-green-500', items: ['Risk engine', 'Onboarding flow'] },
  ];
  return (
    <IllustrationShell>
      {/* Sidebar + kanban */}
      <div className="grid grid-cols-[80px_1fr] gap-3">
        {/* Mini sidebar */}
        <div className="space-y-1.5">
          <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Verticals</p>
          {['Core Platform', 'Growth', 'Enterprise', 'Mobile'].map((v, i) => (
            <div key={v} className={`ill-card text-[8px] px-2 py-1.5 rounded ${i === 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:bg-white/5'}`} style={{ animationDelay: `${i * 0.08}s` }}>
              {v}
            </div>
          ))}
        </div>
        {/* Kanban columns */}
        <div className="flex gap-2 overflow-hidden">
          {columns.map((col, ci) => (
            <div key={col.title} className="ill-card flex-1 min-w-0" style={{ animationDelay: `${0.1 + ci * 0.1}s` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`h-1.5 w-1.5 rounded-full ${col.color}`} />
                <span className="text-[8px] font-semibold text-slate-400">{col.title}</span>
                <span className="text-[7px] text-slate-600 ml-auto">{col.items.length}</span>
              </div>
              <div className="space-y-1.5">
                {col.items.map((item, ii) => (
                  <div key={item} className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2" style={{ animationDelay: `${0.2 + ci * 0.1 + ii * 0.08}s` }}>
                    <p className="text-[8px] text-slate-300 truncate">{item}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-1 flex-1 rounded-full bg-white/5">
                        <div className={`h-1 rounded-full ${col.color}`} style={{ width: `${30 + ci * 15}%`, animation: 'ill-grow 1s ease-out both', animationDelay: `${0.5 + ci * 0.15}s`, transformOrigin: 'left' }} />
                      </div>
                      <span className="text-[7px] text-slate-600">{30 + ci * 15}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </IllustrationShell>
  );
}

/* ── Brain Canvas (mini version for Section 3 & 4) ─────────── */
function BrainCanvasMini() {
  return (
    <IllustrationShell>
      <div className="grid grid-cols-[90px_1fr_90px] gap-2 min-h-[200px]">
        {/* Left */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-1 mb-1">
              <ShieldAlert className="h-2.5 w-2.5 text-red-400" />
              <span className="text-[8px] font-semibold text-white/70">Risks</span>
            </div>
            <div className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-red-400" /><span className="text-[7px] text-slate-500">3 active</span></div>
          </div>
          <div className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-1 mb-1">
              <Binoculars className="h-2.5 w-2.5 text-slate-400" />
              <span className="text-[8px] font-semibold text-white/70">Competitors</span>
            </div>
            <span className="text-[7px] text-slate-500">3 tracked</span>
          </div>
        </div>
        {/* Center */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-purple-500 border border-white/[0.06] p-2" style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-1"><Eye className="h-2.5 w-2.5 text-purple-400" /><span className="text-[8px] font-semibold text-white/70">Vision</span></div>
            <p className="text-[7px] text-slate-400 mt-0.5">North star · 3 goals</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {['Core', 'Growth', 'Enterprise', 'Mobile'].map((v, i) => (
              <div key={v} className="ill-card ill-fl rounded bg-white/[0.04] border border-white/[0.06] p-1.5" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="flex items-center gap-1">
                  <Package className="h-2 w-2 text-indigo-400" />
                  <span className="text-[7px] text-white/70 font-medium">{v}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-pink-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-1"><Users className="h-2.5 w-2.5 text-pink-400" /><span className="text-[8px] font-semibold text-white/70">Personas</span></div>
          </div>
        </div>
        {/* Right */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-green-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5 text-green-400" /><span className="text-[8px] font-semibold text-white/70">Market</span></div>
            <span className="text-[7px] text-slate-500">12 insights</span>
          </div>
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-blue-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-1"><Brain className="h-2.5 w-2.5 text-blue-400" /><span className="text-[8px] font-semibold text-white/70">Foundation</span></div>
            <p className="text-[7px] text-green-400 font-medium mt-0.5">92% aligned</p>
          </div>
        </div>
      </div>
    </IllustrationShell>
  );
}

/* ── Meeting Intelligence ──────────────────────────────────── */
function MeetingsIllustration() {
  return (
    <IllustrationShell>
      <div className="grid grid-cols-[1fr_140px] sm:grid-cols-[1fr_180px] gap-3">
        {/* Meeting list */}
        <div className="space-y-2">
          {[
            { title: 'Sprint Planning Q2', date: 'Apr 7', status: 'Summarized', color: 'bg-green-500', items: 3 },
            { title: 'Product Sync', date: 'Apr 5', status: 'Summarized', color: 'bg-green-500', items: 5 },
            { title: 'Stakeholder Review', date: 'Apr 3', status: 'Summarized', color: 'bg-green-500', items: 2 },
          ].map((m, i) => (
            <div key={m.title} className={`ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 ${i === 0 ? 'ring-1 ring-blue-500/30' : ''}`} style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-2 w-2 rounded-full ${m.color}`} />
                <span className="text-[9px] font-semibold text-white/80 truncate">{m.title}</span>
                <span className="text-[7px] text-slate-600 ml-auto">{m.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{m.status}</span>
                <span className="text-[7px] text-slate-500">{m.items} action items</span>
              </div>
            </div>
          ))}
        </div>
        {/* Extracted panel */}
        <div className="ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-3" style={{ animationDelay: '0.3s' }}>
          <p className="text-[8px] font-semibold text-white/70 mb-2">AI Summary</p>
          <div className="space-y-1 mb-3">
            {['Discussed Q2 priorities', 'Aligned on roadmap scope', 'Flagged 2 risks'].map(s => (
              <p key={s} className="text-[7px] text-slate-400 leading-relaxed">{s}</p>
            ))}
          </div>
          <p className="text-[8px] font-semibold text-white/70 mb-1.5">Action Items</p>
          {['Update roadmap by Friday', 'Review SSO proposal', 'Schedule risk review'].map((a, i) => (
            <div key={a} className="flex items-center gap-1.5 mb-1" style={{ animation: 'ill-fade 0.5s ease both', animationDelay: `${0.6 + i * 0.12}s` }}>
              <div className="h-3 w-3 rounded border border-white/10 flex items-center justify-center">
                {i === 0 && <Check className="h-2 w-2 text-green-400" />}
              </div>
              <span className="text-[7px] text-slate-400 truncate">{a}</span>
            </div>
          ))}
          <p className="text-[8px] font-semibold text-white/70 mt-3 mb-1.5">Decisions</p>
          {['Ship mobile MVP in Q3', 'Pause data migration'].map((d, i) => (
            <div key={d} className="flex items-center gap-1.5 mb-1" style={{ animation: 'ill-fade 0.5s ease both', animationDelay: `${0.9 + i * 0.1}s` }}>
              <Zap className="h-2 w-2 text-amber-400 flex-shrink-0" />
              <span className="text-[7px] text-slate-400 truncate">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </IllustrationShell>
  );
}

/* ── Risk Monitor ──────────────────────────────────────────── */
function RisksIllustration() {
  const summary = [
    { label: 'Critical', count: 1, color: 'bg-red-500', textColor: 'text-red-400' },
    { label: 'High', count: 3, color: 'bg-orange-500', textColor: 'text-orange-400' },
    { label: 'Medium', count: 5, color: 'bg-amber-500', textColor: 'text-amber-400' },
    { label: 'Low', count: 2, color: 'bg-green-500', textColor: 'text-green-400' },
  ];
  const risks = [
    { title: 'API latency exceeds SLA', severity: 'Critical', color: 'bg-red-500', score: 87 },
    { title: 'Vendor contract renewal risk', severity: 'High', color: 'bg-orange-500', score: 72 },
    { title: 'Data migration complexity', severity: 'High', color: 'bg-orange-500', score: 65 },
  ];
  return (
    <IllustrationShell>
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {summary.map((s, i) => (
          <div key={s.label} className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2 text-center" style={{ animationDelay: `${i * 0.08}s` }}>
            <p className={`text-sm font-bold ${s.textColor}`}>{s.count}</p>
            <p className="text-[7px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Risk list */}
      <div className="space-y-2">
        {risks.map((r, i) => (
          <div key={r.title} className={`ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 ${i === 0 ? 'ring-1 ring-red-500/20' : ''}`} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-2 w-2 rounded-full ${r.color} flex-shrink-0`} />
              <span className="text-[9px] font-semibold text-white/80 truncate">{r.title}</span>
              <span className={`text-[7px] px-1.5 py-0.5 rounded ${r.color}/10 ${r.color === 'bg-red-500' ? 'text-red-400 bg-red-500/10' : 'text-orange-400 bg-orange-500/10'} ml-auto`}>{r.severity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-slate-500">Risk score</span>
              <div className="h-1.5 flex-1 rounded-full bg-white/5">
                <div className={`h-1.5 rounded-full ${r.color}`} style={{ width: `${r.score}%`, animation: 'ill-grow 1s ease-out both', animationDelay: `${0.5 + i * 0.15}s`, transformOrigin: 'left' }} />
              </div>
              <span className={`text-[8px] font-semibold ${r.color === 'bg-red-500' ? 'text-red-400' : 'text-orange-400'}`}>{r.score}</span>
            </div>
          </div>
        ))}
      </div>
    </IllustrationShell>
  );
}

/* ── Discovery / Landscape ─────────────────────────────────── */
function DiscoveryIllustration() {
  return (
    <IllustrationShell>
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <div className="text-[8px] px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Competitors</div>
        <div className="text-[8px] px-2.5 py-1 rounded text-slate-500 bg-white/3">Market Research</div>
      </div>
      {/* Competitor grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: 'Productboard', changes: 12, trend: 'up' },
          { name: 'Aha!', changes: 8, trend: 'stable' },
          { name: 'Airfocus', changes: 5, trend: 'up' },
        ].map((c, i) => (
          <div key={c.name} className="ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5" style={{ animationDelay: `${i * 0.12}s` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-slate-400">{c.name[0]}</div>
              <span className="text-[9px] font-semibold text-white/80 truncate">{c.name}</span>
            </div>
            <p className="text-[7px] text-slate-500 mb-1.5">{c.changes} changes detected</p>
            {/* Mini sparkline */}
            <svg viewBox="0 0 80 20" className="w-full h-4">
              <polyline
                fill="none"
                stroke={c.trend === 'up' ? '#22c55e' : '#94a3b8'}
                strokeWidth="1.5"
                strokeLinecap="round"
                points={c.trend === 'up' ? '0,16 15,12 30,14 45,8 60,10 75,4' : '0,10 15,12 30,10 45,11 60,10 75,10'}
                style={{ animation: 'ill-fade 1s ease both', animationDelay: `${0.4 + i * 0.15}s` }}
              />
            </svg>
          </div>
        ))}
      </div>
      {/* Intel feed */}
      <div className="mt-3 space-y-1.5">
        <p className="text-[8px] text-slate-500 font-semibold">Latest Intelligence</p>
        {[
          { text: 'Productboard launched AI roadmap feature', time: '2h ago', type: 'Feature' },
          { text: 'Aha! raised Series D at $200M valuation', time: '6h ago', type: 'Funding' },
          { text: 'Airfocus added Jira bidirectional sync', time: '1d ago', type: 'Integration' },
        ].map((item, i) => (
          <div key={item.text} className="ill-card flex items-center gap-2 rounded bg-white/[0.02] p-1.5" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
            <span className="text-[7px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex-shrink-0">{item.type}</span>
            <span className="text-[7px] text-slate-400 truncate">{item.text}</span>
            <span className="text-[7px] text-slate-600 ml-auto flex-shrink-0">{item.time}</span>
          </div>
        ))}
      </div>
    </IllustrationShell>
  );
}

/* ── Value Meter ───────────────────────────────────────────── */
function ValueMeterIllustration() {
  const initiatives = [
    { name: 'AI Chat v2', value: 92, effort: 65, roi: 'High', color: 'text-green-400' },
    { name: 'Risk Engine', value: 85, effort: 40, roi: 'High', color: 'text-green-400' },
    { name: 'Onboarding Flow', value: 78, effort: 30, roi: 'High', color: 'text-green-400' },
    { name: 'SSO Integration', value: 60, effort: 80, roi: 'Medium', color: 'text-amber-400' },
    { name: 'Mobile App', value: 45, effort: 90, roi: 'Low', color: 'text-red-400' },
  ];
  return (
    <IllustrationShell>
      {/* Chart area — scatter plot mockup */}
      <div className="relative h-40 mb-4 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
        {/* Axis labels */}
        <span className="absolute -left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] text-slate-600">Business Value →</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[7px] text-slate-600">Effort →</span>
        {/* Quadrant lines */}
        <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/5" />
        <div className="absolute top-1/2 left-3 right-3 h-px bg-white/5" />
        {/* Quadrant labels */}
        <span className="absolute top-4 left-4 text-[6px] text-green-500/40 font-medium">HIGH VALUE / LOW EFFORT</span>
        <span className="absolute bottom-4 right-4 text-[6px] text-red-500/40 font-medium">LOW VALUE / HIGH EFFORT</span>
        {/* Dots */}
        {[
          { x: '25%', y: '15%', color: 'bg-green-400', label: 'AI Chat' },
          { x: '20%', y: '25%', color: 'bg-green-400', label: 'Risk Engine' },
          { x: '15%', y: '30%', color: 'bg-green-400', label: 'Onboarding' },
          { x: '65%', y: '45%', color: 'bg-amber-400', label: 'SSO' },
          { x: '80%', y: '65%', color: 'bg-red-400', label: 'Mobile' },
        ].map((d, i) => (
          <div key={d.label} className="absolute flex items-center gap-1" style={{ left: d.x, top: d.y, animation: 'ill-fade 0.5s ease both', animationDelay: `${0.3 + i * 0.12}s` }}>
            <div className={`h-2.5 w-2.5 rounded-full ${d.color}`} style={{ animation: 'ill-pulse 2s ease-in-out infinite', animationDelay: `${i * 0.3}s` }} />
            <span className="text-[7px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-2 text-[7px] text-slate-600 font-medium pb-1 border-b border-white/5">
          <span>Initiative</span><span className="text-center">Value</span><span className="text-center">Effort</span><span className="text-center">ROI</span>
        </div>
        {initiatives.map((ini, i) => (
          <div key={ini.name} className="ill-card grid grid-cols-4 gap-2 items-center py-1" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
            <span className="text-[8px] text-slate-300 truncate">{ini.name}</span>
            <div className="flex items-center justify-center gap-1">
              <div className="h-1 w-10 rounded-full bg-white/5"><div className="h-1 rounded-full bg-blue-400" style={{ width: `${ini.value}%`, animation: 'ill-grow 0.8s ease-out both', animationDelay: `${0.6 + i * 0.1}s`, transformOrigin: 'left' }} /></div>
              <span className="text-[7px] text-slate-500">{ini.value}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <div className="h-1 w-10 rounded-full bg-white/5"><div className="h-1 rounded-full bg-purple-400" style={{ width: `${ini.effort}%`, animation: 'ill-grow 0.8s ease-out both', animationDelay: `${0.7 + i * 0.1}s`, transformOrigin: 'left' }} /></div>
              <span className="text-[7px] text-slate-500">{ini.effort}</span>
            </div>
            <span className={`text-[8px] font-medium text-center ${ini.color}`}>{ini.roi}</span>
          </div>
        ))}
      </div>
    </IllustrationShell>
  );
}

/* ── Feature illustration router ───────────────────────────── */
function FeatureIllustration({ featureId }: { featureId: string }) {
  switch (featureId) {
    case 'brain': return <BrainCanvasMini />;
    case 'portfolio': return <PortfolioIllustration />;
    case 'meetings': return <MeetingsIllustration />;
    case 'risks': return <RisksIllustration />;
    case 'discovery': return <DiscoveryIllustration />;
    case 'value': return <ValueMeterIllustration />;
    default: return <BrainCanvasMini />;
  }
}

/* ── How It Works — 3 equal-height screens ─────────────────── */
function HowItWorksScreen({ step }: { step: number }) {
  /* Shared screen shell — fixed height, subtle chrome */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[#0c1222] rounded-xl border border-white/10 overflow-hidden h-[340px] flex flex-col">
      {/* Minimal browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        <div className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/15" />
      </div>
      <div className="flex-1 p-4 overflow-hidden">{children}</div>
    </div>
  );

  /* ── Screen 1: Role Selection ── */
  if (step === 0) {
    const roles = [
      { title: 'Solo PM', time: '~3 min', color: 'border-l-blue-500', icon: Rocket, desc: 'AI fills in your strategy while you focus on building.' },
      { title: 'Head of Product', time: '~10 min', color: 'border-l-purple-500', icon: Users, desc: 'Import tools, AI structures your portfolio.' },
      { title: 'VP / Director', time: '~15 min', color: 'border-l-rose-500', icon: Building2, desc: 'Define vision top-down, build governance.' },
      { title: 'Just exploring', time: '~1 min', color: 'border-l-slate-400', icon: Eye, desc: 'Quick tour, dive in when ready.' },
    ];
    return (
      <Shell>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <div className="h-2 w-7 rounded-full bg-blue-500" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
        </div>
        <p className="text-[11px] font-semibold text-white/80 text-center mb-4">What best describes you?</p>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className={`ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] ${r.color} border-l-2 p-3 ${i === 0 ? 'ring-1 ring-blue-500/40 bg-blue-500/5' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-white/80">{r.title}</span>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed mb-1.5">{r.desc}</p>
                <span className="text-[9px] text-slate-600">{r.time}</span>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  /* ── Screen 2: Portfolio pipeline ── */
  if (step === 1) {
    const verticals = [
      { name: 'Core Platform', count: 5, active: true },
      { name: 'Growth', count: 3, active: false },
      { name: 'Enterprise', count: 4, active: false },
    ];
    const stages = [
      { name: 'Ideas', color: 'bg-gray-400', w: 'w-[20%]' },
      { name: 'Discovery', color: 'bg-amber-500', w: 'w-[20%]' },
      { name: 'Validation', color: 'bg-blue-400', w: 'w-[20%]' },
      { name: 'Definition', color: 'bg-blue-500', w: 'w-[20%]' },
      { name: 'Approved', color: 'bg-green-500', w: 'w-[20%]' },
    ];
    const initiatives = [
      { name: 'AI Chat v2', stage: 'Approved', color: 'bg-green-500', progress: 85 },
      { name: 'Risk Engine', stage: 'Definition', color: 'bg-blue-500', progress: 60 },
      { name: 'Onboarding Flow', stage: 'Validation', color: 'bg-blue-400', progress: 45 },
    ];
    return (
      <Shell>
        {/* Vertical selector */}
        <div className="flex gap-2 mb-4">
          {verticals.map((v, i) => (
            <div
              key={v.name}
              className={`ill-card text-[9px] px-2.5 py-1.5 rounded-md ${v.active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium' : 'text-slate-500 bg-white/[0.03] border border-white/[0.06]'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {v.name} <span className="text-slate-600 ml-1">{v.count}</span>
            </div>
          ))}
        </div>
        {/* Pipeline bar */}
        <div className="flex rounded-md overflow-hidden h-5 mb-5">
          {stages.map((s, i) => (
            <div
              key={s.name}
              className={`${s.w} ${s.color} flex items-center justify-center border-r border-[#0c1222]/40 last:border-r-0`}
              style={{ animation: 'ill-grow 0.8s ease-out both', animationDelay: `${0.2 + i * 0.1}s`, transformOrigin: 'left' }}
            >
              <span className="text-[8px] font-medium text-white/90">{s.name}</span>
            </div>
          ))}
        </div>
        {/* Initiative cards */}
        <div className="space-y-2.5">
          {initiatives.map((ini, i) => (
            <div key={ini.name} className="ill-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-3" style={{ animationDelay: `${0.4 + i * 0.12}s` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-white/80">{ini.name}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${ini.color}/10 font-medium`} style={{ color: ini.color === 'bg-green-500' ? '#4ade80' : ini.color === 'bg-blue-500' ? '#60a5fa' : '#93c5fd' }}>
                  {ini.stage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/5">
                  <div className={`h-1.5 rounded-full ${ini.color}`} style={{ width: `${ini.progress}%`, animation: 'ill-grow 1s ease-out both', animationDelay: `${0.6 + i * 0.15}s`, transformOrigin: 'left' }} />
                </div>
                <span className="text-[9px] text-slate-500 font-medium">{ini.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  /* ── Screen 3: Brain Canvas mini ── */
  return (
    <Shell>
      <div className="grid grid-cols-[70px_1fr_70px] gap-2 h-full">
        {/* Left: Risks + Competitors */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <ShieldAlert className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-semibold text-white/70">Risks</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-red-400" /><span className="text-[8px] text-slate-400">Latency</span></div>
              <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-orange-400" /><span className="text-[8px] text-slate-400">Vendor</span></div>
            </div>
          </div>
          <div className="text-center text-[8px] text-slate-600">threatens →</div>
          <div className="ill-card rounded bg-white/[0.04] border border-white/[0.06] p-2" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <Binoculars className="h-3 w-3 text-slate-400" />
              <span className="text-[9px] font-semibold text-white/70">Comp.</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] text-slate-400">Productboard</p>
              <p className="text-[8px] text-slate-400">Aha!</p>
            </div>
          </div>
          <div className="text-center text-[8px] text-slate-600">pressures →</div>
        </div>

        {/* Center: Vision → Verticals → Personas */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-purple-500 border border-white/[0.06] p-2" style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-1 mb-1">
              <Eye className="h-3 w-3 text-purple-400" />
              <span className="text-[9px] font-semibold text-white/70">Vision</span>
            </div>
            <p className="text-[9px] text-slate-300 leading-snug">&ldquo;Ship the right thing, faster&rdquo;</p>
          </div>
          <div className="text-center text-[8px] text-slate-600">↓ verticals</div>
          <div className="grid grid-cols-2 gap-1.5">
            {['Core', 'Growth', 'Enterprise', 'Mobile'].map((v, i) => (
              <div key={v} className="ill-card ill-fl rounded bg-white/[0.04] border border-white/[0.06] px-2 py-1.5 text-center" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                <span className="text-[9px] text-white/70 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="text-center text-[8px] text-slate-600">↓ serves</div>
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-pink-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3 text-pink-400" />
              <span className="text-[9px] font-semibold text-white/70">Personas</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {['Solo PM', 'Head of PM', 'VP'].map(p => (
                <span key={p} className="text-[8px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Market + Foundation */}
        <div className="space-y-2">
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-green-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-[9px] font-semibold text-white/70">Market</span>
            </div>
            <p className="text-[8px] text-slate-400">3 competitors</p>
            <p className="text-[8px] text-slate-400">12 insights</p>
          </div>
          <div className="text-center text-[8px] text-slate-600">↓ powers</div>
          <div className="ill-card rounded bg-white/[0.04] border-l-2 border-l-blue-500 border border-white/[0.06] p-2" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <Brain className="h-3 w-3 text-blue-400" />
              <span className="text-[9px] font-semibold text-white/70">Foundation</span>
            </div>
            <p className="text-[8px] text-slate-400">42 nodes</p>
            <p className="text-[9px] text-green-400 font-medium">92% aligned</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── animated Brain Canvas illustration for Hero ─────────── */
function BrainCanvasHero() {
  return (
    <div className="relative bg-[#0c1222] rounded-2xl border border-white/10 overflow-hidden p-4 sm:p-6">
      <style>{`
        @keyframes bc-fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bc-float-1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes bc-float-2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes bc-pulse-line { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.4; } }
        @keyframes bc-dot-pulse { 0%, 100% { opacity: 0.4; r: 2; } 50% { opacity: 1; r: 3; } }
        @keyframes bc-bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .bc-card { animation: bc-fade-in 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .bc-f1 { animation: bc-float-1 4s ease-in-out infinite; }
        .bc-f2 { animation: bc-float-2 5s ease-in-out infinite; }
      `}</style>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-48 h-48 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      {/* Top bar mockup */}
      <div className="relative flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">A</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Company Brain</span>
        </div>
        <div className="ml-auto flex gap-2">
          {['Vision', 'Portfolio', 'Assessment'].map(t => (
            <div key={t} className="px-2 py-0.5 rounded text-[9px] text-slate-500 bg-white/3">{t}</div>
          ))}
        </div>
      </div>

      {/* 3-column canvas layout */}
      <div className="relative grid grid-cols-[120px_1fr_120px] sm:grid-cols-[140px_1fr_140px] gap-3 min-h-[260px] sm:min-h-[320px]">

        {/* ── LEFT COLUMN: External Forces ── */}
        <div className="space-y-3">
          {/* Risks card */}
          <div className="bc-card bc-f1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-4 w-4 rounded bg-red-500/15 flex items-center justify-center">
                <ShieldAlert className="h-2.5 w-2.5 text-red-400" />
              </div>
              <span className="text-[10px] font-semibold text-white/80">Risks</span>
              <span className="ml-auto text-[9px] text-slate-500 bg-white/5 px-1.5 rounded">3</span>
            </div>
            {[{ t: 'API latency spike', c: 'bg-red-400' }, { t: 'Vendor lock-in', c: 'bg-orange-400' }, { t: 'Data migration', c: 'bg-yellow-400' }].map(r => (
              <div key={r.t} className="flex items-center gap-1.5 mb-1">
                <div className={`h-1.5 w-1.5 rounded-full ${r.c} flex-shrink-0`} />
                <span className="text-[9px] text-slate-400 truncate">{r.t}</span>
              </div>
            ))}
          </div>

          {/* Flow arrow */}
          <div className="flex items-center justify-center text-[8px] text-slate-600">
            threatens →
          </div>

          {/* Competitors card */}
          <div className="bc-card bc-f2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-4 w-4 rounded bg-slate-500/15 flex items-center justify-center">
                <Binoculars className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-white/80">Competitors</span>
            </div>
            {['Productboard', 'Aha!', 'Airfocus'].map(c => (
              <p key={c} className="text-[9px] text-slate-400 mb-0.5 truncate">{c}</p>
            ))}
          </div>
        </div>

        {/* ── CENTER COLUMN: Strategy ── */}
        <div className="space-y-3">
          {/* Vision card */}
          <div className="bc-card rounded-lg bg-white/[0.04] border-l-2 border-purple-500 border-r border-t border-b border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] p-3" style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-semibold text-white/80">Vision</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">&ldquo;Empower every product team to ship the right thing, faster.&rdquo;</p>
            <p className="text-[9px] text-slate-500 mt-1">3 business goals · 92% aligned</p>
          </div>

          {/* Flow arrow */}
          <div className="flex items-center justify-center text-[8px] text-slate-600">
            ↓ organized into verticals
          </div>

          {/* Verticals grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Core Platform', count: 5, items: ['AI Chat v2', 'Risk Engine'], colors: ['bg-green-500', 'bg-blue-500'] },
              { name: 'Growth', count: 3, items: ['Onboarding Flow', 'Referral System'], colors: ['bg-blue-400', 'bg-amber-500'] },
              { name: 'Enterprise', count: 4, items: ['SSO Integration', 'Audit Logs'], colors: ['bg-green-500', 'bg-blue-500'] },
              { name: 'Mobile', count: 2, items: ['iOS App', 'Push Notifications'], colors: ['bg-amber-500', 'bg-gray-400'] },
            ].map((v, vi) => (
              <div
                key={v.name}
                className="bc-card rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5"
                style={{ animationDelay: `${0.3 + vi * 0.15}s` }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package className="h-3 w-3 text-indigo-400" />
                  <span className="text-[9px] font-semibold text-white/80 truncate">{v.name}</span>
                  <span className="ml-auto text-[8px] text-slate-500 bg-white/5 px-1 rounded">{v.count}</span>
                </div>
                {v.items.map((item, ii) => (
                  <div key={item} className="flex items-center gap-1 mb-0.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${v.colors[ii]} flex-shrink-0`} />
                    <span className="text-[8px] text-slate-400 truncate">{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Flow arrow */}
          <div className="flex items-center justify-center text-[8px] text-slate-600">
            ↓ serves
          </div>

          {/* Personas card */}
          <div className="bc-card rounded-lg bg-white/[0.04] border-l-2 border-pink-500 border-r border-t border-b border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] p-2.5" style={{ animationDelay: '0.9s' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-[10px] font-semibold text-white/80">Personas</span>
            </div>
            <div className="flex gap-2">
              {['Solo PM', 'Head of PM', 'VP Product'].map(p => (
                <span key={p} className="text-[8px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Growth ── */}
        <div className="space-y-3">
          {/* Market card */}
          <div className="bc-card bc-f2 rounded-lg bg-white/[0.04] border-l-2 border-green-500 border-r border-t border-b border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] p-2.5" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              <span className="text-[10px] font-semibold text-white/80">Market</span>
            </div>
            <p className="text-[9px] text-slate-400">3 competitors tracked</p>
            <p className="text-[9px] text-slate-400">12 AI insights</p>
          </div>

          {/* Flow arrow */}
          <div className="flex items-center justify-center text-[8px] text-slate-600">
            ↓ opportunity for
          </div>

          {/* Foundation card */}
          <div className="bc-card bc-f1 rounded-lg bg-white/[0.04] border-l-2 border-slate-500 border-r border-t border-b border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] p-2.5" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] font-semibold text-white/80">Foundation</span>
            </div>
            <p className="text-[9px] text-slate-400">42 brain nodes</p>
            <p className="text-[9px] text-slate-400">128 connections</p>
            <p className="text-[9px] text-green-400 font-medium mt-1">92% aligned</p>
          </div>
        </div>

        {/* ── Connection lines (SVG overlay) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* Horizontal connectors: left → center */}
          <line x1="18%" y1="15%" x2="22%" y2="20%" stroke="url(#bc-grad-red)" strokeWidth="1" style={{ animation: 'bc-pulse-line 3s ease-in-out infinite' }} />
          <line x1="18%" y1="50%" x2="22%" y2="35%" stroke="url(#bc-grad-slate)" strokeWidth="1" style={{ animation: 'bc-pulse-line 3s ease-in-out infinite 0.5s' }} />
          {/* Horizontal connectors: center → right */}
          <line x1="78%" y1="20%" x2="82%" y2="15%" stroke="url(#bc-grad-green)" strokeWidth="1" style={{ animation: 'bc-pulse-line 3s ease-in-out infinite 1s' }} />
          <line x1="78%" y1="50%" x2="82%" y2="50%" stroke="url(#bc-grad-blue)" strokeWidth="1" style={{ animation: 'bc-pulse-line 3s ease-in-out infinite 1.5s' }} />
          {/* Animated data dots */}
          <circle cx="20%" cy="18%" fill="#ef4444" style={{ animation: 'bc-dot-pulse 2s ease-in-out infinite' }}>
            <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="80%" cy="18%" fill="#22c55e" style={{ animation: 'bc-dot-pulse 2s ease-in-out infinite 0.7s' }}>
            <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" begin="0.7s" />
          </circle>
          <circle cx="50%" cy="55%" fill="#a78bfa" style={{ animation: 'bc-dot-pulse 2.5s ease-in-out infinite 1.2s' }}>
            <animate attributeName="r" values="1.5;3;1.5" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
          </circle>
          <defs>
            <linearGradient id="bc-grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bc-grad-slate" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bc-grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="bc-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-white pr-4">{q}</span>
        <ChevronDown className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-5 w-5 text-green-400 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-slate-600 mx-auto" />;
  return <span className="text-sm">{value}</span>;
}

/* ── main component ──────────────────────────────────────── */
export function LandingPage() {
  const containerRef = useScrollReveal();
  const scrolled = useScrolled();
  const [activeFeature, setActiveFeature] = useState(0);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(0.95); }
          66% { transform: translate(15px, -30px) scale(1.05); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.1); }
          50% { box-shadow: 0 0 30px rgba(59,130,246,0.6), 0 0 80px rgba(59,130,246,0.2); }
        }
        .hero-bg {
          background: linear-gradient(-45deg, #0f172a, #1e1b4b, #172554, #0c4a6e, #1e1b4b, #0f172a);
          background-size: 400% 400%;
          animation: gradient-shift 12s ease infinite;
        }
        .gradient-text-anim {
          background: linear-gradient(90deg, #60a5fa, #a78bfa, #818cf8, #60a5fa);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-text 4s ease infinite;
        }
        .orb-a { animation: float-a 8s ease-in-out infinite; }
        .orb-b { animation: float-b 10s ease-in-out infinite; }
        .cta-glow { animation: glow-pulse 2.5s ease-in-out infinite; }
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .glass-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(99,102,241,0.4);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(99,102,241,0.1);
        }
      `}</style>

      {/* ═══════════ SECTION 1: NAV ═══════════ */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-slate-950/80 border-b border-white/10 shadow-lg' : 'bg-transparent'}`}>
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Azmyra</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-slate-400 hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm text-slate-400 hover:text-white transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">Sign In</Button>
            </Link>
            <Link href="/auth/signin?register=true">
              <Button className="bg-blue-600 hover:bg-blue-500">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ SECTION 1: HERO ═══════════ */}
      <section className="hero-bg relative">
        <div className="orb-a absolute top-20 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="orb-b absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-24 pb-16 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            AI-native product management
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
            Your AI-Powered{' '}
            <span className="gradient-text-anim">Product Management</span>{' '}
            Platform
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Replace fragmented tools with 6 specialized AI agents that understand your product,
            track risks, generate roadmaps, and keep your team aligned.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signin?register=true">
              <Button size="lg" className="cta-glow bg-blue-600 hover:bg-blue-500 text-lg px-10 h-14 rounded-xl font-medium">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <button onClick={() => scrollToSection('how-it-works')} className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
              See how it works
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Product visual — animated Brain Canvas */}
        <div className="relative px-6 pb-20 max-w-5xl mx-auto" data-reveal>
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10">
            <BrainCanvasHero />
          </div>
        </div>

        {/* Social proof */}
        <div className="pb-20 text-center text-sm text-slate-500" data-reveal>
          Built for Solo PMs, Heads of Product, and VPs
        </div>
      </section>

      {/* ═══════════ SECTION 2: PAIN POINTS ═══════════ */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Managing products shouldn&apos;t feel like this.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAIN_POINTS.map((p, i) => (
            <div key={p.title} className="glass-card rounded-2xl p-6" data-reveal data-delay={i * 100}>
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <p.icon className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SECTION 3: SOLUTION ═══════════ */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-12" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            One platform. Six AI agents. Complete clarity.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Azmyra replaces your fragmented tool stack with an AI-native workspace where
            vision, strategy, and execution are connected — and 6 specialized agents do the heavy lifting.
          </p>
        </div>
        <div data-reveal>
          <BrainCanvasMini />
        </div>
      </section>

      {/* ═══════════ SECTION 4: HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Up and running in 3 minutes.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.step} data-reveal data-delay={i * 120}>
              <div className="text-5xl font-bold text-blue-500/20 mb-3">{s.step}</div>
              <h3 className="text-lg font-semibold mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{s.desc}</p>
              <HowItWorksScreen step={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SECTION 5: FEATURES DEEP DIVE ═══════════ */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything a product team needs — powered by AI.
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8" data-reveal>
          {/* Feature tabs on the left */}
          <div className="lg:col-span-2 space-y-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isActive = activeFeature === i;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${isActive ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>{f.title}</h3>
                        {'comingSoon' in f && f.comingSoon && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Coming soon</span>
                        )}
                      </div>
                      {isActive && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Screenshot on the right */}
          <div className="lg:col-span-3">
            <div className="sticky top-24">
              <FeatureIllustration featureId={FEATURES[activeFeature].id} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 6: PERSONAS ═══════════ */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Built for how <span className="gradient-text-anim">you</span> work.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.role} className="glass-card rounded-2xl p-6 flex flex-col" data-reveal data-delay={i * 100}>
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 italic leading-relaxed mb-4 flex-1">&ldquo;{p.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Setup: {p.time}</span>
                  <Link href={`/auth/signin?register=true&role=${p.role}`}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs">
                      Start as {p.title.split(' ')[0]} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ SECTION 7: AI AGENTS ═══════════ */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Bot className="h-4 w-4" />
            Autonomous AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            6 specialized agents work while you sleep.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AGENTS.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={a.name} className="glass-card rounded-2xl p-5" data-reveal data-delay={i * 80}>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{a.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ SECTION 8: INTEGRATIONS ═══════════ */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center" data-reveal>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Connects to your existing stack.
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
          Import your backlog from Jira. Sync notes from Confluence. Get AI summaries in Slack. Everything flows into one brain.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {INTEGRATIONS.map((integ) => (
            <div
              key={integ.name}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm ${integ.soon ? 'bg-white/3 border-white/5 text-slate-500' : 'bg-white/5 border-white/10 text-slate-300'}`}
            >
              <Zap className="h-3.5 w-3.5" />
              {integ.name}
              {integ.soon && <span className="text-xs text-slate-600 ml-1">soon</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SECTION 9: COMPARISON ═══════════ */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-12" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How Azmyra compares.
          </h2>
        </div>
        <div className="overflow-x-auto" data-reveal>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 pr-4 text-slate-400 font-medium"></th>
                <th className="py-3 px-4 text-center">
                  <span className="text-blue-400 font-semibold">Azmyra</span>
                </th>
                <th className="py-3 px-4 text-center text-slate-400">Productboard</th>
                <th className="py-3 px-4 text-center text-slate-400">Jira Product Discovery</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-slate-300">{row.feature}</td>
                  <td className="py-3 px-4 text-center text-blue-400 font-medium"><ComparisonCell value={row.azmyra} /></td>
                  <td className="py-3 px-4 text-center text-slate-400"><ComparisonCell value={row.pb} /></td>
                  <td className="py-3 px-4 text-center text-slate-400"><ComparisonCell value={row.jira} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════ SECTION 10: PRICING ═══════════ */}
      <section id="pricing" className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Free to start. Scale when you&apos;re ready.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto" data-reveal>
          {/* Beta — Free */}
          <div className="glass-card rounded-2xl p-8 relative">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              Beta
            </div>
            <h3 className="text-2xl font-bold mb-1">Free</h3>
            <p className="text-slate-500 text-sm mb-6">Everything you need to get started</p>
            <ul className="space-y-3 mb-8">
              {['Full platform access', '6 AI agents', 'Up to 5 verticals', 'Community support'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signin?register=true">
              <Button className="w-full bg-blue-600 hover:bg-blue-500">Get Started Free</Button>
            </Link>
          </div>
          {/* Enterprise */}
          <div className="glass-card rounded-2xl p-8">
            <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-medium mb-4">
              Enterprise
            </div>
            <h3 className="text-2xl font-bold mb-1">Contact us</h3>
            <p className="text-slate-500 text-sm mb-6">For teams that need more</p>
            <ul className="space-y-3 mb-8">
              {['Unlimited everything', 'SSO + RBAC', 'SOC 2 compliance (coming)', 'Dedicated support'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="mailto:contact@theproductowner.org">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/5">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 11: FAQ ═══════════ */}
      <section id="faq" className="px-6 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-12" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Questions? We&apos;ve got answers.
          </h2>
        </div>
        <div data-reveal>
          {FAQ.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ═══════════ SECTION 12: FINAL CTA + FOOTER ═══════════ */}
      <section className="px-6 py-24 text-center" data-reveal>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Ready to see your product strategy clearly?
        </h2>
        <p className="text-slate-400 text-lg mb-8">
          Free to try. It takes 3 minutes.
        </p>
        <Link href="/auth/signin?register=true">
          <Button size="lg" className="cta-glow bg-blue-600 hover:bg-blue-500 text-lg px-10 h-14 rounded-xl font-medium">
            Get Started Free
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-bold">Azmyra</span>
              </div>
              <p className="text-xs text-slate-500">AI-Powered Product Management</p>
            </div>
            {/* Product links */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className="text-sm text-slate-500 hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="text-sm text-slate-500 hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-sm text-slate-500 hover:text-white transition-colors">Brain Canvas</button></li>
              </ul>
            </div>
            {/* Company links */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="https://www.linkedin.com/in/yassinezaibi/" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors">About</a></li>
                <li><a href="https://www.linkedin.com/in/yassinezaibi/" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-slate-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-slate-500 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Azmyra. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
