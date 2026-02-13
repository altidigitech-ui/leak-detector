import Link from 'next/link';
import { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Landing page optimization insights backed by data. Audits, benchmarks, and actionable CRO advice from analyzing 50+ SaaS pages.',
  openGraph: {
    title: 'Blog — Leak Detector',
    description: 'Data-driven landing page optimization insights.',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">LD</div>
            <span className="text-white font-semibold">Leak Detector</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-slate-300 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/blog" className="text-white font-medium text-sm">Blog</Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm">Log in</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Get Started Free</Link>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Blog</h1>
          <p className="text-xl text-slate-400 mb-16">Data-driven insights on landing page optimization, CRO, and conversion benchmarks.</p>

          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors mb-3">{post.title}</h2>
                  <p className="text-slate-400 leading-relaxed mb-4">{post.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                    <span>·</span>
                    <span>{post.author}</span>
                  </div>
                </Link>
                <div className="mt-8 border-b border-slate-800" />
              </article>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p>© {new Date().getFullYear()} Leak Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
