import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/settings', '/analyze', '/reports', '/api/'],
    },
    sitemap: 'https://leakdetector.tech/sitemap.xml',
  };
}
