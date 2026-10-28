// What vite-imagetools gives an image imported in webp with `as=picture`: its srcset, and the
// largest image (`vite.config.ts`).
// One image in webp, at the width asked: its address.
declare module '*&format=webp' {
  const src: string;
  export default src;
}

declare module '*&format=webp&as=picture' {
  const picture: { sources: { webp: string }; img: { src: string; w: number; h: number } };
  export default picture;
}
