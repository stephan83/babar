import chalk from 'chalk';
import type { Color } from './types.js';

// 8-level vertical block characters: index 0 = empty, 8 = full block
const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
const BLOCKS_ASCII_FILL = 'X';
const REF_CHAR = '╌';
const REF_CHAR_ASCII = '-';

function repeat(n: number, ch: string): string {
  if (n <= 0) return '';
  return ch.repeat(n);
}

function colorize(str: string, color: Color): string {
  if (color === 'ascii') return str;
  const fn = (chalk as unknown as Record<string, (s: string) => string>)[color];
  return fn ? fn(str) : str;
}

function blockChar(fraction: number): string {
  const idx = Math.round(fraction * 8);
  return BLOCKS[Math.min(8, Math.max(0, idx))];
}

function cellChar(r: number, v: number, ascii: boolean): string {
  const full = Math.floor(v);
  if (r < full) return ascii ? BLOCKS_ASCII_FILL : '█';
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
  refRow?: number,
): string {
  const ascii = color === 'ascii';
  const isRefRow = refRow !== undefined && r === Math.round(refRow);
  let out = '';

  for (const v of bkt) {
    const ch = cellChar(r, v, ascii);

    if (ch === ' ') {
      if (isRefRow) {
        // reference line overlaid on empty space
        const refCh = ascii ? REF_CHAR_ASCII : colorize(REF_CHAR, grid);
        out += repeat(bktW, refCh);
      } else {
        // normal horizontal grid line
        out += ascii ? repeat(bktW, ' ') : colorize(repeat(bktW, '_'), grid);
      }
    } else {
      // bar body or cap
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
  refRow?: number,
): string {
  return `${drawRowLabel(r, lblY, lblYW)} ${drawRowChart(r, bkt, bktW, color, grid, refRow)}`;
}

export function drawChart(
  h: number,
  lblY: string[],
  lblYW: number,
  bkt: number[],
  bktW: number,
  color: Color,
  grid: Color,
  refRow?: number,
): string {
  const rows: string[] = [];
  for (let r = h - 1; r >= 0; r--) {
    rows.push(drawRow(r, lblY, lblYW, bkt, bktW, color, grid, refRow));
  }
  return rows.join('\n');
}

// ─── Horizontal bar chart ────────────────────────────────────────────────────

const H_BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'] as const;

function hBlockChar(fraction: number): string {
  const idx = Math.round(fraction * 8);
  return H_BLOCKS[Math.min(8, Math.max(0, idx))];
}

function hCellChar(c: number, v: number, ascii: boolean): string {
  const full = Math.floor(v);
  if (c < full) return ascii ? BLOCKS_ASCII_FILL : '█';
  if (c === full) {
    const frac = v - full;
    if (ascii) return frac >= 0.5 ? BLOCKS_ASCII_FILL : ' ';
    return hBlockChar(frac);
  }
  return ' ';
}

export function drawHorizontalChart(
  bkt: number[],
  labels: string[],
  maxLabelW: number,
  barAreaW: number,
  color: Color,
  grid: Color,
  lblY: string[],   // value labels per bucket (for right-side annotation)
  refCol?: number,  // normalized column position of refY
): string {
  const ascii = color === 'ascii';
  const rows: string[] = [];

  for (let i = 0; i < bkt.length; i++) {
    const v = bkt[i];
    const lbl = (labels[i] ?? String(i)).padStart(maxLabelW);
    let bar = '';

    for (let c = 0; c < barAreaW; c++) {
      const ch = hCellChar(c, v, ascii);
      if (ch === ' ') {
        if (refCol !== undefined && c === Math.round(refCol)) {
          bar += ascii ? '|' : colorize('╎', grid);
        } else {
          bar += ascii ? '.' : colorize('·', grid);
        }
      } else {
        bar += ascii ? ch : colorize(ch, color);
      }
    }

    const valLbl = ` ${lblY[i] ?? ''}`;
    rows.push(`${lbl} ${bar}${valLbl}`);
  }

  return rows.join('\n');
}
