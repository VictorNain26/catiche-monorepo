import { light } from '@repo/tokens/scales.json';
import { BRAND_NAME, SITE_DESCRIPTION } from '@/lib/brand';

// A manifest can't read CSS variables: the step theme.css's background points at.
const MIST = light['mist-1'];

export function GET() {
  return Response.json({
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: SITE_DESCRIPTION,
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
