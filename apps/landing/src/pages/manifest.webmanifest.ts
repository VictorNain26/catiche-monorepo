import { BRAND_NAME } from '@/lib/brand';

// A manifest can't read CSS variables: --mist-1 of packages/tokens/scales.css, the background.
const MIST = '#EFF3F1';

export function GET() {
  return Response.json({
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: 'Une aide aux devoirs pour les collégiens, de la 6e à la 3e, en préparation.',
    start_url: '/',
    display: 'standalone',
    background_color: MIST,
    theme_color: MIST,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
}
