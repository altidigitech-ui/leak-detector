import Link from 'next/link';

const categories = [
  { icon: '📝', name: 'Headline', description: 'Clarity and value proposition strength' },
  { icon: '🎯', name: 'Call-to-Action', description: 'Button visibility and persuasive copy' },
  { icon: '⭐', name: 'Social Proof', description: 'Testimonials and trust indicators' },
  { icon: '📋', name: 'Forms', description: 'Field optimization and friction reduction' },
  { icon: '👁️', name: 'Visual Hierarchy', description: 'Layout flow and content structure' },
  { icon: '🔒', name: 'Trust', description: 'Security signals and credibility' },
  { icon: '📱', name: 'Mobile', description: 'Responsive design and touch targets' },
  { icon: '⚡', name: 'Speed', description: 'Load performance and core web vitals' },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    period: 'forever',
    description: 'Perfect to get started',
    features: ['3 analyses per month', 'Score & issue detection', 'Category breakdown', 'Email support'],
    cta: 'Get Started Free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '29',
    period: 'per month',
    description: 'For growing businesses',
    features: ['50 analyses per month', 'Full detailed recommendations', 'PDF export', 'Unlimited history', 'Priority support'],
    cta: 'Start Pro',
    href: '/register?plan=pro',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '99',
    period: 'per month',
    description: 'For teams and agencies',
    features: ['200 analyses per month', 'Full detailed recommendations', 'PDF export', 'Unlimited history', 'Dedicated support'],
    cta: 'Start Agency',
    href: '/register?plan=agency',
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-sm">
              LD
            </span>
            <span>Leak Detector</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 pt-20 overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 hero-grid opacity-50" />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-primary-300 text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                AI-Powered CRO Analysis — 8 Dimensions Scored
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Stop Losing Visitors.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">
                  Start Converting.
                </span>
              </h1>

              <p className="text-xl text-slate-300 mb-8 max-w-lg">
                AI analyzes your landing page in 60 seconds and tells you exactly what to fix to boost conversions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="btn-primary text-lg px-8 py-4 animate-pulse-glow"
                >
                  Analyze My Page — Free
                </Link>
                <Link
                  href="#example"
                  className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg px-8 py-4"
                >
                  See Example Report
                </Link>
              </div>

              <p className="mt-6 text-slate-400 text-sm">
                No credit card required • 3 free analyses per month
              </p>
            </div>

            {/* Right - Score Demo */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Floating card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl animate-float">
                  <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm mb-2">Your Landing Page Score</p>
                    <div className="relative w-40 h-40 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray="440"
                          strokeDashoffset="119"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold text-white">73</span>
                        <span className="text-slate-400">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini category bars */}
                  <div className="space-y-3">
                    {[
                      { name: 'Headline', score: 85, color: 'bg-green-400' },
                      { name: 'CTA', score: 45, color: 'bg-red-400' },
                      { name: 'Social Proof', score: 72, color: 'bg-amber-400' },
                    ].map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-24">{cat.name}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cat.color} rounded-full`}
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                        <span className="text-white text-xs w-8">{cat.score}</span>
                      </div>
                    ))}
                  </div>

                  {/* Issue badge */}
                  <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                    <p className="text-red-300 text-sm">
                      <span className="font-medium">3 critical issues</span> found that may hurt conversions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading">How It Works</h2>
            <p className="section-subheading">
              Get actionable insights in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Paste Your URL',
                description: 'Enter your landing page URL. We handle the rest.',
                visual: (
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border-2 border-primary-200">
                      <span className="text-gray-400">https://</span>
                      <span className="text-gray-700">yoursite.com</span>
                      <span className="ml-auto w-2 h-5 bg-primary-500 animate-pulse" />
                    </div>
                  </div>
                ),
              },
              {
                step: '02',
                title: 'AI Scans Everything',
                description: 'Our AI analyzes 8 key conversion areas in 60 seconds.',
                visual: (
                  <div className="bg-gray-100 rounded-xl p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square bg-primary-100 rounded-lg animate-pulse"
                          style={{ animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                step: '03',
                title: 'Get Actionable Fixes',
                description: 'Receive a detailed report with prioritized recommendations.',
                visual: (
                  <div className="bg-gray-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full" />
                      <div className="flex-1 h-3 bg-red-100 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-amber-500 rounded-full" />
                      <div className="flex-1 h-3 bg-amber-100 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full" />
                      <div className="flex-1 h-3 bg-green-100 rounded" />
                    </div>
                  </div>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="inline-block text-6xl font-bold text-primary-100 mb-4">
                  {item.step}
                </span>
                {item.visual}
                <h3 className="text-xl font-semibold mt-6 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50" id="features">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading">8 Dimensions of Conversion</h2>
            <p className="section-subheading">
              Comprehensive analysis across every factor that affects your conversion rate
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="feature-card group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{cat.name}</h3>
                <p className="text-gray-600 text-sm">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Report Preview */}
      <section className="py-24 bg-white" id="example">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading">See What You Get</h2>
            <p className="section-subheading">
              A sample analysis with actionable recommendations
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Score */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="352"
                      strokeDashoffset="95"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">73</span>
                    <span className="text-slate-400 text-sm">/100</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">Sample Analysis: startup.io</h3>
                <p className="text-slate-300 mb-6">
                  Your landing page has good visual design but is losing potential customers due to
                  weak CTAs and missing social proof. Here are the top issues to fix:
                </p>

                {/* Sample issues */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-red-500/20 rounded-xl border border-red-500/30">
                    <span className="text-red-400 text-lg mt-0.5">●</span>
                    <div>
                      <p className="font-medium">CTA button blends with background</p>
                      <p className="text-slate-400 text-sm">Use contrasting colors to make the button stand out</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-amber-500/20 rounded-xl border border-amber-500/30">
                    <span className="text-amber-400 text-lg mt-0.5">●</span>
                    <div>
                      <p className="font-medium">No customer testimonials visible</p>
                      <p className="text-slate-400 text-sm">Add social proof above the fold</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/register" className="btn-primary text-lg px-8 py-4">
                See What We Find on YOUR Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gray-50" id="pricing">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading">Simple, Transparent Pricing</h2>
            <p className="section-subheading">
              Choose the plan that fits your needs. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative ${
                  plan.highlighted
                    ? 'ring-2 ring-primary-500 shadow-xl scale-105'
                    : ''
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1.5 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">€{plan.price}</span>
                    <span className="text-gray-500 ml-1">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">
                        ✓
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-3 rounded-xl font-medium transition-all ${
                    plan.highlighted
                      ? 'btn-primary w-full'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Fix Your Landing Page?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Get a detailed conversion audit in 60 seconds. Find exactly what makes visitors leave your page.
          </p>
          <Link href="/register" className="btn-primary text-lg px-10 py-4 inline-block">
            Start Free Analysis
          </Link>
          <p className="mt-6 text-slate-400">
            Free plan • No credit card • 3 analyses/month
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  LD
                </span>
                <span className="text-white font-semibold">Leak Detector</span>
              </div>
              <p className="text-sm leading-relaxed">
                AI-powered landing page analysis for better conversions. Find and fix what makes visitors leave.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>support@leakdetector.tech</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>© 2026 Leak Detector. All rights reserved.</p>
            <p className="mt-4 md:mt-0">Made with 🔍 for better conversions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
