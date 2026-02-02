import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary-600">
            🔍 Leak Detector
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Find What Makes Visitors
            <span className="text-primary-600"> Leave Your Page</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get an instant AI-powered analysis of your landing page. Identify conversion
            leaks and get actionable recommendations in 30 seconds.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Analyze My Page Free
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-lg px-8 py-3">
              See How It Works
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required • 3 free analyses per month
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20" id="features">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            8 Categories Analyzed
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '📝', title: 'Headline', desc: 'Clarity and value proposition' },
              { icon: '🎯', title: 'Call-to-Action', desc: 'Visibility and wording' },
              { icon: '⭐', title: 'Social Proof', desc: 'Testimonials and trust signals' },
              { icon: '📋', title: 'Forms', desc: 'Friction and field count' },
              { icon: '👁️', title: 'Visual Hierarchy', desc: 'Layout and readability' },
              { icon: '🔒', title: 'Trust', desc: 'Security and credibility' },
              { icon: '📱', title: 'Mobile', desc: 'Responsive design' },
              { icon: '⚡', title: 'Speed', desc: 'Load time and performance' },
            ].map((feature) => (
              <div key={feature.title} className="card text-center">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50" id="how-it-works">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Paste Your URL', desc: 'Enter your landing page URL in our analyzer.' },
              { step: '2', title: 'AI Analysis', desc: 'Our AI scrapes and analyzes your page in 30 seconds.' },
              { step: '3', title: 'Get Your Report', desc: 'Receive a detailed report with scores and recommendations.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-6">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Fix Your Landing Page?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of marketers who improved their conversion rates with Leak Detector.
          </p>
          <Link href="/register" className="btn-primary text-lg px-8 py-3">
            Start Free Analysis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Leak Detector</h4>
              <p className="text-sm">
                AI-powered landing page analysis for better conversions.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>support@leakdetector.io</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2026 Leak Detector. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
