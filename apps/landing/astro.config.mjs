import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://catiche.fr',
  trailingSlash: 'never',
  // aide.html rather than aide/index.html: the Caddyfile serves /aide without a redirect to /aide/.
  build: { format: 'file' },
  server: { port: 3001 },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  // No Markdown here; Shiki's inline styles would only trip the CSP check.
  markdown: { syntaxHighlight: false },
  // The variables packages/tokens/theme.css reads, as the app sets them from fontsource; the
  // variable fonts on their weight axis alone. No mono: the site shows no code.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-brand-text',
      weights: ['200 800'],
      styles: ['normal'],
      subsets: ['latin'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-brand-heading',
      weights: ['200 800'],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],
  security: {
    csp: {
      directives: ["default-src 'self'"],
    },
  },
});
