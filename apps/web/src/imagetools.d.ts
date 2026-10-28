// What vite-imagetools gives an image imported with a query: a srcset, or the URL of a single
// image (`vite.config.ts`).
declare module '*&as=srcset' {
  const srcset: string;
  export default srcset;
}

declare module '*&format=webp' {
  const url: string;
  export default url;
}
