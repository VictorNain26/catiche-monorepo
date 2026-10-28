// What vite-imagetools gives an image imported in webp at one width (`?w=64&format=webp`): its
// address (`tom.tsx`, Tom's head).
declare module '*&format=webp' {
  const src: string;
  export default src;
}

// What vite-imagetools gives an image imported in webp with `as=picture`: its srcset, and the
// largest image (`vite.config.ts`).
declare module '*&format=webp&as=picture' {
  const picture: { sources: { webp: string }; img: { src: string; w: number; h: number } };
  export default picture;
}
