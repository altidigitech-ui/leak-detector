import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Leak Detector',
  description: 'Terms of Service for Leak Detector landing page analysis platform.',
};

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: February 1, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing or using Leak Detector ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service. We reserve the right to update
                these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed">
                Leak Detector is an AI-powered landing page analysis tool that helps identify conversion optimization
                issues. The Service captures web pages, analyzes them using artificial intelligence, and provides
                actionable recommendations to improve conversion rates. Analysis results are provided for informational
                purposes and should be evaluated in the context of your specific business needs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To use the Service, you must create an account and provide accurate, complete information. You are
                responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Using only one account per person unless explicitly authorized</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms or engage in
                fraudulent activity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Subscription and Payments</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Leak Detector offers three subscription tiers: Free, Pro (€29/month), and Agency (€99/month).
                Paid subscriptions are billed monthly through Stripe, our payment processor.
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Subscriptions automatically renew unless canceled before the renewal date</li>
                <li>You may cancel your subscription at any time through the Customer Portal</li>
                <li>Refunds are not provided for partial billing periods</li>
                <li>Price changes will be communicated at least 30 days in advance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Usage Limits</h2>
              <p className="text-gray-700 leading-relaxed">
                Each subscription plan includes a monthly allocation of analyses: Free (3), Pro (50), and Agency (200).
                Unused analyses do not roll over to subsequent billing periods. The analysis count resets on your
                billing renewal date. Exceeding your plan's limits requires upgrading to a higher tier.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                The analysis reports generated by the Service are yours to use for your business purposes. However,
                the Service itself, including its algorithms, software, design, and documentation, remains the
                exclusive property of Leak Detector. You may not copy, modify, distribute, or reverse engineer
                any part of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Prohibited Use</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Analyze pages you do not own or have permission to analyze</li>
                <li>Engage in excessive automated requests or abuse the API</li>
                <li>Attempt to reverse engineer, decompile, or extract our AI models</li>
                <li>Resell or redistribute reports without authorization</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                The Service is provided "as is" without warranties of any kind, either express or implied. We do not
                guarantee that the recommendations provided will result in specific conversion improvements. Leak
                Detector shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                or any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at any time, with or without
                cause, with or without notice. Reasons for termination may include violation of these terms, abusive
                behavior, or failure to pay. Upon termination, your right to use the Service ceases immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may modify these Terms of Service at any time. For material changes, we will notify you via email
                at least 30 days before they take effect. Your continued use of the Service after changes become
                effective constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of France, without regard
                to its conflict of law provisions. Any disputes arising from these terms shall be resolved in the
                courts of Paris, France.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:support@leakdetector.tech" className="text-primary-600 hover:underline">
                  support@leakdetector.tech
                </a>
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
