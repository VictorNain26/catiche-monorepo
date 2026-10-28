import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The tokens theme.css adds to Tailwind's scales: without them, `shadow-sheet` would stay beside a
// `shadow-none` that should replace it, and `text-hero` be taken for a colour.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['sheet', 'control', 'control-hover'],
      text: ['hero', 'closing'],
      radius: ['control'],
      font: ['heading'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
