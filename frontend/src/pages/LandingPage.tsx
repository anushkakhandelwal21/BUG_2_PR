import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, ShieldCheck } from 'lucide-react';
import { FixtrailLogo } from '../components/common/FixtrailLogo';
import { GithubIcon } from '../components/common/Icons';
import { InteractiveHeroWorkflow } from '../components/landing/InteractiveHeroWorkflow';
import { BeforeAfterVerification } from '../components/landing/BeforeAfterVerification';
import { WorkflowSteps } from '../components/landing/WorkflowSteps';
import { VerificationInvariant } from '../components/landing/VerificationInvariant';
import { InspectEveryDecision } from '../components/landing/InspectEveryDecision';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080909] text-[#EDEFEF] selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Precision Editorial Header */}
      <header className="sticky top-0 z-40 bg-[#080909]/95 backdrop-blur-md border-b border-[#1A1C1E]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between font-mono text-xs">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <FixtrailLogo className="text-white" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-zinc-400 text-xs font-mono">
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How It Works</a>
            <a href="#verification" className="hover:text-zinc-100 transition-colors">Verification</a>
            <a href="#invariant" className="hover:text-zinc-100 transition-colors">The Invariant</a>
            <a href="#inspection" className="hover:text-zinc-100 transition-colors">Inspection</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/anushkakhandelwal21/BUG_2_PR"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs font-mono"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <Link
              to="/dashboard"
              className="px-3 py-1.5 bg-[#EDEFEF] hover:bg-white text-[#080909] rounded-[2px] font-sans font-semibold text-xs transition-colors flex items-center gap-1"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3 h-3 text-[#080909]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
        <div className="space-y-4 max-w-3xl">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] text-[11px] font-mono bg-[#111315] border border-[#23262B] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>AUTONOMOUS BUG RESOLUTION</span>
          </div>

          {/* Asymmetric Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#EDEFEF] leading-[1.15] font-sans">
            A fix is only real <br />
            <span className="text-emerald-400">when the test proves it.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed font-sans">
            Bug2PR turns GitHub issues into verified patches. It reproduces the failure, writes a regression test, implements the fix, and checks the complete test suite before a pull request can proceed.
          </p>

          {/* Tagline & Assurance */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>From Issue to Verified PR &bull; Isolated container sandboxes &bull; 100% test-verified</span>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="pt-3 flex flex-wrap items-center gap-3 font-mono text-xs">
            <Link
              to="/runs/new"
              className="px-4 py-2 bg-[#EDEFEF] hover:bg-white text-[#080909] font-sans font-semibold rounded-[2px] transition-colors flex items-center gap-1.5"
            >
              <span>Resolve an Issue</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#080909]" />
            </Link>

            <a
              href="#how-it-works"
              className="px-4 py-2 bg-[#121316] hover:bg-[#1A1D20] border border-[#23262B] text-zinc-300 rounded-[2px] transition-colors flex items-center gap-1.5 font-sans"
            >
              <span>See How It Works</span>
            </a>

            <Link
              to="/runs/run_8f9e21"
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore Live Run</span>
            </Link>
          </div>
        </div>

        {/* 6-Step Interactive Hero Demonstration */}
        <div className="pt-2">
          <InteractiveHeroWorkflow />
        </div>
      </section>

      {/* Section A: The Missing Proof */}
      <div id="verification">
        <BeforeAfterVerification />
      </div>

      {/* Section B: Follow the Trail */}
      <div id="how-it-works">
        <WorkflowSteps />
      </div>

      {/* Section C: The Verification Invariant */}
      <div id="invariant">
        <VerificationInvariant />
      </div>

      {/* Section D: Inspect Every Decision */}
      <div id="inspection">
        <InspectEveryDecision />
      </div>

      {/* Final CTA Section */}
      <section className="py-24 border-t border-[#1C1D1F] bg-[#070808]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Verifiable Engineering</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#EDEFEF] font-sans">
            Give your next bug a verifiable ending.
          </h2>

          <p className="text-sm text-zinc-400 max-w-xl mx-auto font-sans leading-relaxed">
            From Issue to Verified PR. From the first failing test to the final verified patch, every step is traceable.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#EDEFEF] hover:bg-white text-[#080909] font-sans font-semibold rounded-[2px] transition-colors flex items-center justify-center gap-2"
            >
              <span>Open Bug2PR</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#080909]" />
            </Link>
            <Link
              to="/runs/new"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#121316] hover:bg-[#1A1D20] border border-[#23262B] text-zinc-300 font-sans rounded-[2px] transition-colors flex items-center justify-center gap-2"
            >
              <span>Submit Issue URL</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Precision Footer */}
      <footer className="border-t border-[#1C1D1F] py-8 px-4 font-mono text-xs text-zinc-500 bg-[#060707]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FixtrailLogo className="text-zinc-400" />
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-400 font-sans text-xs">From Issue to Verified PR</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span className="text-zinc-400">Strict Invariant Enforced</span>
            <span>&bull;</span>
            <Link to="/settings" className="hover:text-zinc-300 transition-colors">Repository Settings</Link>
            <span>&bull;</span>
            <Link to="/dashboard" className="hover:text-zinc-300 transition-colors">Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
