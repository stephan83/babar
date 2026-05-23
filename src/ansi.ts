import type { Color } from './types.js';

// Standard ANSI foreground color codes for the colors we support
const FG: Record<string, number> = {
  black: 30, red: 31, green: 32, yellow: 33,
  blue: 34, magenta: 35, cyan: 36, white: 37,
  grey: 90, gray: 90,
};

function esc(code: number, str: string): string {
  return `\x1b[${code}m${str}\x1b[0m`;
}

export function colorize(str: string, color: Color): string {
  if (color === 'ascii') return str;
  const code = FG[color];
  return code !== undefined ? esc(code, str) : str;
}

export function bold(str: string): string {
  return esc(1, str);
}
