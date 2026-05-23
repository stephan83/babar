import chalk from 'chalk';
import type { Color } from './types.js';

// 8-level vertical block characters: index 0 = empty, 8 = full block
const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
const BLOCKS_ASCII_FILL = 'X';

function repeat(n: number, ch: string): string {
  if (n <= 0) return '';
  return ch.repeat(n);
}

function colorize(str: string, color: Color): string {
  if (color === 'ascii') return str;
  const fn = (chalk as unknown as Record<string, (s: string) => string>)[color];
  return fn ? fn(str) : str;
}

/**
 * Returns the block character for a fractional fill level [0..1].
 * 0 → empty, 1 → full █
 */
function blockChar(fraction: number): string {
  const idx = Math.round(fraction * 8);
  return BLOCKS[Math.min(8, Math.max(0, idx))];
}

/**
 * Render one column cell at row `r` for a bar of normalized height `v`.
 * `v` is in [0..height-1] coordinate space (floats).
 *
 * Row 0 is the bottom, row (height-1) is the top.
 * For each row:
 *   - row < floor(v)  → full block (bar body)
 *   - row = floor(v)  → partial block (bar cap, fractional part of v)
 *   - row > floor(v)  → empty (above bar)
 */
function cellChar(r: number, v: number, ascii: boolean): string {
  const full = Math.floor(v);
  if (r < full) {
    return ascii ? BLOCKS_ASCII_FILL : '█';
  }
  if (r === full) {
    const frac = v - full;
    if (ascii) return frac >= 0.5 ? BLOCKS_ASCII_FILL : ' ';
    return blockChar(frac);
  }
  return ' ';
}

export function drawRowChart(
  r: number,
  bkt: number[],
  bktW: number,
  color: Color,
  grid: Color,
): string {
  const ascii = color === 'ascii';
  let out = '';

  for (const v of bkt) {
    const ch = cellChar(r, v, ascii);

    if (ch === ' ') {
      // above bar: full cell is horizontal grid line
      out += ascii ? repeat(bktW, ' ') : colorize(repeat(bktW, '_'), grid);
    } else {
      // bar body or cap: colored fill, right edge is a grid underscore
      const bodyW = Math.max(1, bktW - 1);
      const colored = ascii ? repeat(bodyW, ch) : colorize(repeat(bodyW, ch), color);
      const edge = bktW > 1 ? (ascii ? ' ' : colorize('_', grid)) : '';
      out += colored + edge;
    }
  }

  return out;
}

export function drawRowLabel(r: number, lblY: string[], lblYW: number): string {
  const lbl = r === 0 || lblY[r] !== lblY[r - 1] ? lblY[r] : '';
  return repeat(lblYW - lbl.length - 1, ' ') + lbl;
}

export function drawRow(
  r: number,
  lblY: string[],
  lblYW: number,
  bkt: number[],
  bktW: number,
  color: Color,
  grid: Color,
): string {
  return `${drawRowLabel(r, lblY, lblYW)} ${drawRowChart(r, bkt, bktW, color, grid)}`;
}

export function drawChart(
  h: number,
  lblY: string[],
  lblYW: number,
  bkt: number[],
  bktW: number,
  color: Color,
  grid: Color,
): string {
  const rows: string[] = [];
  for (let r = h - 1; r >= 0; r--) {
    rows.push(drawRow(r, lblY, lblYW, bkt, bktW, color, grid));
  }
  return rows.join('\n');
}
