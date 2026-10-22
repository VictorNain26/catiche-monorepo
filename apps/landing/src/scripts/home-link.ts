// The logo leads home (`href="/"`, atoms/logo.astro). On the home page itself, a plain click brings back its top
// rather than reloading it; any other click is the browser's (a new tab, a window, a download).

// Built as files (astro.config.mjs), the home page's path may be « /index.html ».
const HOME = /^\/(?:index(?:\.html)?)?$/u;

interface Click {
  readonly button: number;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export function returnsToTop(pathname: string, click: Click): boolean {
  return HOME.test(pathname) && click.button === 0 && !click.ctrlKey && !click.metaKey && !click.shiftKey && !click.altKey;
}
