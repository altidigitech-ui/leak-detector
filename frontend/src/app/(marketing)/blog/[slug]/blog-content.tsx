'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function BlogContent({ content }: { content: string }) {
  return (
    <div className="prose prose-lg prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-th:text-slate-300 prose-td:text-slate-400 prose-th:border-slate-700 prose-td:border-slate-800 prose-hr:border-slate-800 prose-blockquote:border-slate-700 prose-blockquote:text-slate-400 prose-li:text-slate-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
