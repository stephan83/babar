import chalk from 'chalk';
import { validatePoints, validateOptions } from './validate.js';
import { computeStats, bucketize } from './buckets.js';
import { drawChart } from './draw.js';
import type { Point, Options, Color } from './types.js';

export type { Point, Options, Color };

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

function repeat(n: number, ch: string): string {
  if (n <= 0) return '';
  return ch.repeat(n);
}

export default function babar(points: Point[], options: Options = {}): string {
  validatePoints(points);
  validateOptions(options);

  const color: Color = options.color ?? 'cyan';
  const grid: Color = options.grid ?? 'black';
  let width = options.width ?? 80;
  let height = options.height ?? 15;

  const stats = computeStats(points);
  const minX = options.minX ?? stats.minX;
  const maxX = options.maxX ?? stats.maxX;
  const minY = options.minY;
  const maxY = options.maxY;

  const diffX = maxX - minX;
  const diffY = (maxY ?? stats.maxY) - (minY ?? stats.minY);

  const caption = options.caption;
  height -= 1 + (caption !== undefined ? 1 : 0);

  const yFractions = options.yFractions ??
    clamp(0, 8, Math.log(height / (diffY || 1) * 5) / Math.LN10);

  const effectiveMinY = minY ?? stats.minY;
  const effectiveMaxY = maxY ?? stats.maxY;

  const lblYW = 1 + Math.max(
    effectiveMinY.toFixed(yFractions).length,
    effectiveMaxY.toFixed(yFractions).length,
  );

  width -= lblYW;

  const numBkts = Math.max(1, Math.min(stats.uniqueX, width));
  const bktW = Math.max(1, Math.floor(width / numBkts));

  const xFractions = options.xFractions ??
    clamp(0, 8, Math.log(numBkts / (diffX || 1) * 5) / Math.LN10);

  const { bkt, min, max, diff } = bucketize(
    points, numBkts, minX, diffX, minY, maxY, height,
  );

  // Build Y axis labels (bottom to top)
  const lblY: string[] = [];
  for (let v = height - 1; v >= 0; v--) {
    lblY.unshift((min + diff * v / Math.max(1, height - 1)).toFixed(yFractions));
  }

  // Compute X label density
  let lblXW = 0;
  for (let u = 0; u < numBkts; u++) {
    const lbl = (minX + u * (diffX || 0) / Math.max(1, numBkts - 1)).toFixed(xFractions);
    lblXW = Math.max(lblXW, lbl.length);
  }

  let lblXN = numBkts;
  let lblXI = 1;
  while ((lblXN + 1) * lblXW >= numBkts * bktW) {
    lblXN = Math.floor(lblXN / 2);
    lblXI *= 2;
  }

  let out = '';

  if (caption !== undefined) {
    out += repeat(lblYW, ' ');
    out += color === 'ascii' ? caption : chalk.bold(caption);
    out += '\n';
  }

  out += drawChart(height, lblY, lblYW, bkt, bktW, color, grid) + '\n';
  out += repeat(lblYW, ' ');

  for (let x = 0; x < lblXN; x++) {
    const u = x * lblXI;
    const lbl = (minX + u * (diffX || 0) / Math.max(1, numBkts - 1)).toFixed(xFractions);
    out += lbl;
    out += repeat(bktW * lblXI - lbl.length, ' ');
  }

  return out;
}

// Allow `require('babar')` to work directly without `.default`
if (typeof module !== 'undefined') {
  module.exports = babar;
  module.exports.default = babar;
}
