import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Leak Detector',
  description: 'Privacy Policy for Leak Detector — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary-600">
            🔍 Leak Detector
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: February 1, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Leak Detector ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use our landing page
                analysis service. We are committed to GDPR compliance and respect your data protection rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Account Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Email address (required for account creation)</li>
                <li>Full name (optional)</li>
                <li>Password (stored securely using industry-standard hashing)</li>
              </ul>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Data</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>URLs of pages you submit for analysis</li>
                <li>Page content captured during analysis (HTML, text, screenshots)</li>
                <li>Generated reports and recommendations</li>
              </ul>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Billing details are processed by Stripe</li>
                <li>We do not store credit card numbers on our servers</li>
                <li>We retain Stripe customer IDs for subscription management</li>
              </ul>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Usage Data</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Feature usage statistics</li>
                <li>Error reports for service improvement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the collected information to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide and maintain the Service, including processing your analyses</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send important service-related communications</li>
                <li>Improve our AI analysis capabilities and user experience</li>
                <li>Respond to your support requests and inquiries</li>
                <li>Detect and prevent fraudulent or abusive usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Legal Basis (GDPR)</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under GDPR, we process your data based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Contract Performance:</strong> Processing necessary to provide the Service you requested</li>
                <li><strong>Legitimate Interest:</strong> Improving our service, fraud prevention, and security</li>
                <li><strong>Legal Obligation:</strong> Compliance with applicable laws and regulations</li>
                <li><strong>Consent:</strong> When you explicitly opt-in (e.g., marketing communications)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the following third-party services to operate Leak Detector:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Supabase</strong> — Database and authentication (EU data region)</li>
                <li><strong>Stripe</strong> — Payment processing (PCI-DSS compliant)</li>
                <li><strong>Anthropic</strong> — AI analysis (page content is sent for analysis)</li>
                <li><strong>Vercel</strong> — Frontend hosting</li>
                <li><strong>Railway</strong> — Backend hosting</li>
                <li><strong>Sentry</strong> — Error monitoring and performance tracking</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Each provider has their own privacy policy and data processing agreements. We ensure all providers
                meet GDPR requirements where applicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your data as follows:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Account data:</strong> Retained while your account is active</li>
                <li><strong>Analysis reports:</strong> Retained for the duration of your subscription (unlimited for paid plans, 7 days for free)</li>
                <li><strong>Deleted accounts:</strong> Data is permanently deleted within 30 days of account deletion</li>
                <li><strong>Logs and analytics:</strong> Retained for up to 90 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under GDPR, you have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Right to Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Right to Restriction:</strong> Request limitation of processing in certain circumstances</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:support@leakdetector.tech" className="text-primary-600 hover:underline">
                  support@leakdetector.tech
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use only essential cookies necessary for the Service to function properly. These include
                authentication session cookies managed by Supabase. We do not use tracking cookies, advertising
                cookies, or third-party analytics cookies. Your browser settings allow you to control cookie
                preferences, but disabling essential cookies may affect Service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>All data transmitted via HTTPS/TLS encryption</li>
                <li>Data encrypted at rest using AES-256 (Supabase)</li>
                <li>Passwords hashed using bcrypt with secure salting</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and principle of least privilege</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. For material changes, we will notify you via
                email at least 30 days before they take effect. The "Last updated" date at the top of this page
                indicates when the policy was last revised. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about this Privacy Policy or wish to exercise your data rights, please
                contact us:
              </p>
              <ul className="list-none text-gray-700 mt-4 space-y-1">
                <li><strong>Email:</strong>{' '}
                  <a href="mailto:support@leakdetector.tech" className="text-primary-600 hover:underline">
                    support@leakdetector.tech
                  </a>
                </li>
                <li><strong>Data Protection Officer:</strong>{' '}
                  <a href="mailto:dpo@leakdetector.tech" className="text-primary-600 hover:underline">
                    dpo@leakdetector.tech
                  </a>
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                If you believe we have not adequately addressed your concerns, you have the right to lodge a
                complaint with your local data protection authority.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t">
            <Link href="/" className="text-primary-600 hover:underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
          </div>
          <p>© 2026 Leak Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
