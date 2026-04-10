import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Azmyra',
};

export default function PrivacyPage() {
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
          <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
            Terms of Service
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-16 prose prose-invert prose-sm prose-slate">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: April 10, 2026</p>

        <p>
          This Privacy Policy describes how Azmyra, operated by The Product Owner (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;),
          collects, uses, and protects your information when you use our AI-powered product management platform
          at <strong>ai.theproductowner.org</strong> (the &ldquo;Service&rdquo;).
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">1. Information We Collect</h2>

        <h3 className="text-base font-semibold mt-6 mb-2">Account Information</h3>
        <p>When you create an account, we collect your name, email address, and a hashed password. If you sign in via Google or Microsoft, we receive your name, email, and profile picture from the OAuth provider.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">Product Data</h3>
        <p>Data you enter into Azmyra — including initiatives, meeting transcripts, risks, personas, competitors, roadmap items, and vision statements — is stored in our database and associated with your account.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">Integration Credentials</h3>
        <p>If you connect third-party services (Jira, Confluence, Slack, Notion, Linear, GitHub), we store the necessary authentication tokens. These credentials are encrypted at rest using AES-256-GCM encryption before being written to the database.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">LLM API Keys</h3>
        <p>
          You may provide API keys for third-party AI providers (OpenAI, Anthropic, Groq, or others).
          These keys are stored <strong>only in your browser&rsquo;s local storage</strong> and are never transmitted to or stored on our servers.
          They are sent directly from your browser to the respective AI provider&rsquo;s API.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">Usage Data</h3>
        <p>We collect basic usage information such as pages visited, features used, and error logs to improve the Service. We do not use third-party analytics trackers.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>To provide and maintain the Service</li>
          <li>To authenticate your identity and manage your account</li>
          <li>To connect with third-party integrations you authorize (Jira, Slack, etc.)</li>
          <li>To process your data through AI agents for summaries, risk analysis, and recommendations</li>
          <li>To send transactional emails (account verification, password reset)</li>
          <li>To improve the Service based on aggregated, anonymized usage patterns</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">3. Third-Party Services</h2>
        <p>Azmyra integrates with the following categories of third-party services:</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li><strong>AI/LLM Providers</strong> (OpenAI, Anthropic, Groq): Your prompts and product data may be sent to these providers when you use AI features. We use your own API keys — we do not proxy through our accounts. Refer to each provider&rsquo;s privacy policy for their data handling practices.</li>
          <li><strong>Productivity Tools</strong> (Jira, Confluence, Slack, Notion, Linear, GitHub): Data is fetched from and sent to these services only when you explicitly authorize the connection. We access only the scopes you approve.</li>
          <li><strong>Authentication Providers</strong> (Google, Microsoft): Used only for sign-in. We receive your name and email.</li>
          <li><strong>Cloud Infrastructure</strong> (Google Cloud Platform): Our Service runs on Google Cloud Run in the us-central1 region. Data is stored in a Google Cloud SQL PostgreSQL database.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">4. Data Storage and Security</h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>All data is encrypted in transit (TLS/HTTPS) and at rest</li>
          <li>Integration credentials are encrypted using AES-256-GCM with a dedicated encryption key</li>
          <li>Passwords are hashed using bcrypt with a work factor of 12</li>
          <li>LLM API keys are stored only in your browser and never reach our servers</li>
          <li>Database backups are encrypted and retained for disaster recovery</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">5. Data Retention</h2>
        <p>We retain your data for as long as your account is active. If you delete your account, we will delete all associated data within 30 days, except where retention is required by law.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li><strong>Access</strong> your data — all product data is visible in the application</li>
          <li><strong>Export</strong> your data — contact us at the email below</li>
          <li><strong>Delete</strong> your data — you can delete your account from the Settings page, which removes all associated data</li>
          <li><strong>Revoke</strong> integration access — disconnect any third-party service at any time from Settings</li>
          <li><strong>Withdraw consent</strong> — stop using the Service at any time; your locally stored LLM keys are removed by clearing browser storage</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">7. Cookies</h2>
        <p>We use only essential cookies required for authentication (session token). We do not use advertising or tracking cookies.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">8. Children&rsquo;s Privacy</h2>
        <p>The Service is not intended for users under 16 years of age. We do not knowingly collect data from children.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &ldquo;Last updated&rdquo; date.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">10. Contact</h2>
        <p>
          For privacy-related inquiries, data export requests, or to exercise your rights, contact us at:<br />
          <a href="mailto:privacy@theproductowner.org" className="text-blue-400 hover:text-blue-300">privacy@theproductowner.org</a>
        </p>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-slate-600">
          &copy; {new Date().getFullYear()} Azmyra / The Product Owner. All rights reserved.
        </div>
      </article>
    </div>
  );
}
