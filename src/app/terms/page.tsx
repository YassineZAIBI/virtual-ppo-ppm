import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Azmyra',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold">Azmyra</span>
          </Link>
          <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-16 prose prose-invert prose-sm prose-slate">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: April 10, 2026</p>

        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Azmyra, an AI-powered product management
          platform operated by The Product Owner (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), accessible at
          {' '}<strong>ai.theproductowner.org</strong> (the &ldquo;Service&rdquo;). By creating an account or using the
          Service, you agree to these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">1. Beta Product Disclaimer</h2>
        <p>
          <strong>The Service is currently in beta.</strong> This means:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Features may change, be added, or be removed without notice</li>
          <li>The Service may experience downtime, bugs, or data inconsistencies</li>
          <li>We do not guarantee any specific uptime, availability, or performance level</li>
          <li>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind</li>
          <li>Beta features are not covered by any SLA (Service Level Agreement)</li>
        </ul>
        <p className="mt-3">
          We recommend maintaining your own backups of critical data and not relying on Azmyra as your sole source of truth during the beta period.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">2. Account Registration</h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>You must provide accurate information when creating an account</li>
          <li>You are responsible for maintaining the security of your account credentials</li>
          <li>You must be at least 16 years old to use the Service</li>
          <li>One person or legal entity per account — shared accounts are not permitted</li>
          <li>You are responsible for all activity that occurs under your account</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">3. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to other users&rsquo; accounts or data</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Use automated scripts to scrape or overload the Service</li>
          <li>Upload malicious content, malware, or content that violates third-party rights</li>
          <li>Resell or redistribute the Service without written permission</li>
          <li>Use the Service to compete with Azmyra by building a substantially similar product</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">4. Your Data</h2>

        <h3 className="text-base font-semibold mt-6 mb-2">Ownership</h3>
        <p>You retain full ownership of all data you enter into Azmyra, including initiatives, meeting transcripts, risks, personas, and any other product data. We do not claim any intellectual property rights over your content.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">License to Us</h3>
        <p>By using the Service, you grant us a limited license to store, process, and display your data solely for the purpose of providing the Service to you. This license terminates when you delete your data or your account.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">Data Deletion</h3>
        <p>You may delete your account at any time from the Settings page. Upon deletion, all your data will be permanently removed within 30 days. This action is irreversible.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">5. Third-Party Services and API Keys</h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Azmyra allows you to connect third-party services (Jira, Confluence, Slack, Notion, Linear, GitHub) and provide your own LLM API keys (OpenAI, Anthropic, Groq, etc.)</li>
          <li>You are solely responsible for your use of these third-party services, including compliance with their terms of service</li>
          <li>Your LLM API keys are stored only in your browser&rsquo;s local storage — we do not have access to them</li>
          <li>When you use AI features, your product data may be sent to the LLM provider you configured. We are not responsible for how third-party providers handle that data</li>
          <li>You are responsible for any costs incurred through your use of third-party API keys</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">6. AI-Generated Content</h2>
        <p>
          The Service uses artificial intelligence to generate summaries, recommendations, risk assessments, and other content.
          AI-generated content is provided for informational purposes only and should not be relied upon as a substitute for professional judgment.
          We do not guarantee the accuracy, completeness, or suitability of AI-generated outputs.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">7. Pricing and Payment</h2>
        <p>
          The Service is currently offered free of charge during the beta period.
          We reserve the right to introduce paid plans in the future. If we do, we will provide at least 30 days&rsquo; notice
          before any charges apply to your account. You will have the option to export your data and close your account
          before any paid plan takes effect.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied</li>
          <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages</li>
          <li>We are not liable for any loss of data, profits, or business opportunities arising from your use of the Service</li>
          <li>Our total liability to you shall not exceed the amount you have paid us in the 12 months preceding the claim (which, during beta, is zero)</li>
          <li>We are not liable for any actions taken based on AI-generated content</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Azmyra and The Product Owner from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">10. Termination</h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>You may terminate your account at any time by deleting it from Settings</li>
          <li>We may suspend or terminate your account if you violate these Terms</li>
          <li>We may discontinue the Service at any time with 30 days&rsquo; notice</li>
          <li>Upon termination, your right to use the Service ceases immediately</li>
          <li>Sections 4 (Your Data — Ownership), 8 (Limitation of Liability), and 9 (Indemnification) survive termination</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">11. Changes to These Terms</h2>
        <p>
          We may modify these Terms at any time. Material changes will be communicated via email or a notice within the Service at least 14 days before taking effect. Continued use of the Service after changes take effect constitutes acceptance.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction where The Product Owner is incorporated, without regard to conflict of law principles. Any disputes shall be resolved through good-faith negotiation first, and if unresolved, through binding arbitration.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">13. Contact</h2>
        <p>
          For questions about these Terms, contact us at:<br />
          <a href="mailto:legal@theproductowner.org" className="text-blue-400 hover:text-blue-300">legal@theproductowner.org</a>
        </p>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-slate-600">
          &copy; {new Date().getFullYear()} Azmyra / The Product Owner. All rights reserved.
        </div>
      </article>
    </div>
  );
}
