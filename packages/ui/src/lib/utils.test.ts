import { describe, expect, it } from 'bun:test';
import { cn } from './utils';

describe('cn', () => {
  it('lets a later class replace an earlier one of the tokens of theme.css', () => {
    expect(cn('shadow-sheet', 'shadow-none')).toBe('shadow-none');
    expect(cn('shadow-control', 'shadow-control-hover')).toBe('shadow-control-hover');
    expect(cn('text-base', 'text-hero')).toBe('text-hero');
    expect(cn('rounded-2xl', 'rounded-control')).toBe('rounded-control');
    expect(cn('font-sans', 'font-heading')).toBe('font-heading');
  });

  it('keeps a size and a colour of text, which do not replace each other', () => {
    expect(cn('text-closing', 'text-foreground')).toBe('text-closing text-foreground');
  });

  it('keeps Tailwind’s own merges', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
    expect(cn('shadow-sm', 'shadow-none')).toBe('shadow-none');
  });
});
