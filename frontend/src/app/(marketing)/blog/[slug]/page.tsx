import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { BlogContent } from './blog-content';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: `${post.title} — Leak Detector`,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug);
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Leak Detector',
      url: 'https://leakdetector.tech',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">LD</div>
            <span className="text-white font-semibold">Leak Detector</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-slate-300 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors text-sm">Pricing</Link>
            <Link href="/blog" className="text-slate-300 hover:text-white transition-colors text-sm">Blog</Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm">Log in</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Get Started Free</Link>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <article className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-8">← Back to Blog</Link>

          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 mb-10">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <span>·</span>
            <span>{post.author}</span>
          </div>

          <BlogContent content={post.content} />

          <div className="mt-16 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Find your landing page leaks</h3>
            <p className="text-slate-300 mb-6">Get a full 8-category audit with actionable recommendations in under 30 seconds.</p>
            <Link href="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">Analyze Your Page Free →</Link>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
            {prevPost && (
              <Link href={`/blog/${prevPost.slug}`} className="group">
                <span className="text-xs text-slate-500">← Previous</span>
                <p className="text-slate-300 group-hover:text-white transition-colors font-medium mt-1">{prevPost.title}</p>
              </Link>
            )}
            {nextPost && (
              <Link href={`/blog/${nextPost.slug}`} className="group md:text-right md:ml-auto">
                <span className="text-xs text-slate-500">Next →</span>
                <p className="text-slate-300 group-hover:text-white transition-colors font-medium mt-1">{nextPost.title}</p>
              </Link>
            )}
          </div>
        </article>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p>© {new Date().getFullYear()} Leak Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
