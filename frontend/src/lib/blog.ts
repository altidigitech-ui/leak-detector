import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: string;
  author: string;
}

export function getAllPosts(): BlogPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));

  const posts = files.map((filename) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
    const { data, content } = matter(raw);

    return {
      slug: data.slug || filename.replace('.md', ''),
      title: data.title || '',
      description: data.description || '',
      date: data.date || '',
      tags: data.tags || [],
      author: data.author || 'Leak Detector Team',
      content,
    };
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}
