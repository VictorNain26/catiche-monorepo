import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { light } from '@repo/tokens/scales.json';
import { BRAND_NAME } from '@/lib/brand';
import { OG_IMAGE } from '@/lib/open-graph';

// Drawn at build time, the image follows the brand name: satori lays it out as next/og did.

// satori reads no CSS variable: the light steps that theme.css's roles point at (background,
// foreground, primary, highlight, muted-foreground).
const MIST = light['mist-1'];
const INK = light['mist-12'];
const PRIMARY = light['water-11'];
const HIGHLIGHT = light['reed-4'];
const MUTED = light['mist-10'];

// satori takes React's element shape, without React.
const node = (type: string, style: Record<string, unknown>, children: unknown) => ({ type, key: null, props: { style, children } });

export const GET: APIRoute = async () => {
  // WOFF: satori reads neither WOFF2 nor the fonts Astro downloads.
  const bricolage = await readFile(
    fileURLToPath(import.meta.resolve('@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff')),
  );
  const tom = `data:image/png;base64,${(await readFile('src/assets/tom.png')).toString('base64')}`;

  const svg = await satori(
    node(
      'div',
      {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 80,
        background: MIST,
        color: INK,
        fontFamily: 'Bricolage Grotesque',
      },
      [
        node('div', { display: 'flex', flexDirection: 'column', width: 640 }, [
          node('div', { display: 'flex', fontSize: 44, color: PRIMARY }, BRAND_NAME),
          node('div', { display: 'flex', flexWrap: 'wrap', marginTop: 40, fontSize: 64, lineHeight: 1.1 }, [
            node('span', {}, "Le soir, l'exercice "),
            node('span', {}, 'restera '),
            node('span', { backgroundImage: `linear-gradient(to top, ${HIGHLIGHT} 50%, transparent 50%)` }, 'le sien'),
            '.',
          ]),
          node('div', { display: 'flex', marginTop: 40, fontSize: 30, color: MUTED }, 'En préparation, pour le collège (6e à 3e)'),
        ]),
        { type: 'img', key: null, props: { src: tom, width: 560, height: 560 } },
      ],
    ),
    { ...OG_IMAGE, fonts: [{ name: 'Bricolage Grotesque', data: bricolage, style: 'normal', weight: 800 }] },
  );
  return new Response(new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer()), { headers: { 'Content-Type': 'image/png' } });
};
