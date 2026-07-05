import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Michi Snackie Plan',
    short_name: 'Michi Snackie',
    description: 'Your calm daily meal companion — five sensible meals a day, zero friction.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#7c3aed',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
