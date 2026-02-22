'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Briefcase, Calendar, Map, Search, AlertTriangle,
  Gauge, ArrowRight, Globe, Workflow, Mail, MessageSquare,
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
      { threshold: 0.15 },
    );
    els.forEach((el) => ob.observe(el));
    return () => ob.disconnect();
  }, []);

  return ref;
}

/* ── data ────────────────────────────────────────────────── */
const features = [
  { icon: Briefcase, title: 'Initiative Pipeline', desc: 'Visual Kanban from idea to approval, AI-prioritized.', gradient: 'from-blue-500 to-cyan-400' },
  { icon: Calendar, title: 'Meeting Intelligence', desc: 'AI attends meetings, extracts summaries and action items.', gradient: 'from-green-500 to-emerald-400' },
  { icon: Map, title: 'Smart Roadmap', desc: 'Auto-generated timelines with dependency tracking.', gradient: 'from-purple-500 to-violet-400' },
  { icon: Search, title: 'Discovery Engine', desc: 'AI-powered user research and impact assessments.', gradient: 'from-indigo-500 to-blue-400' },
  { icon: AlertTriangle, title: 'Risk Monitor', desc: 'Proactive risk detection with AI mitigation plans.', gradient: 'from-rose-500 to-pink-400' },
  { icon: Gauge, title: 'Value Meter', desc: 'Real-time business value tracking per initiative.', gradient: 'from-amber-500 to-yellow-400' },
];

const integrations = [
  { icon: Workflow, name: 'Jira' },
  { icon: Globe, name: 'Confluence' },
  { icon: MessageSquare, name: 'Slack' },
  { icon: Mail, name: 'Email' },
];

/* ── component ───────────────────────────────────────────── */
export function LandingPage() {
  const containerRef = useScrollReveal();

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
        .orb-a {
          animation: float-a 8s ease-in-out infinite;
        }
        .orb-b {
          animation: float-b 10s ease-in-out infinite;
        }
        .cta-glow {
          animation: glow-pulse 2.5s ease-in-out infinite;
        }
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
          transform: scale(1.03) translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(99,102,241,0.1);
        }
        .glass-card:hover .card-icon {
          transform: scale(1.1);
        }
        .card-icon {
          transition: transform 0.3s ease;
        }
      `}</style>

      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Azmyra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">
                Log In
              </Button>
            </Link>
            <Link href="/auth/signin?register=true">
              <Button className="bg-blue-600 hover:bg-blue-500">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="hero-bg relative">
        {/* Decorative orbs */}
        <div className="orb-a absolute top-20 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="orb-b absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-32 pb-40 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Your Autonomous{' '}
            <span className="gradient-text-anim">AI Product Manager</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-12">
            Manage your pipeline, summarize meetings, track risks, and generate roadmaps — autonomously.
          </p>
          <Link href="/auth/signin?register=true">
            <Button size="lg" className="cta-glow bg-blue-600 hover:bg-blue-500 text-lg px-10 h-14 rounded-xl font-medium">
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <p className="mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="px-6 py-28 max-w-6xl mx-auto">
        <div className="text-center mb-16" data-reveal>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Six AI Agents, One Platform
          </h2>
          <p className="text-slate-500 text-lg">
            Each feature is a specialized agent that understands your product.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 cursor-default"
                data-reveal
                data-delay={i * 80}
              >
                <div className={`card-icon h-11 w-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Integrations Row ─── */}
      <section className="px-6 pb-28 max-w-4xl mx-auto" data-reveal>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium uppercase tracking-widest">Works with</span>
          <div className="flex items-center gap-3">
            {integrations.map((integ) => {
              const Icon = integ.icon;
              return (
                <div
                  key={integ.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {integ.name}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="px-6 pb-28 text-center" data-reveal>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Ready to start?
        </h2>
        <p className="text-slate-400 text-lg mb-8">
          Free to try. No credit card required.
        </p>
        <Link href="/auth/signin?register=true">
          <Button size="lg" className="cta-glow bg-blue-600 hover:bg-blue-500 text-lg px-10 h-14 rounded-xl font-medium">
            Create Free Account
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-600 text-sm">
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
