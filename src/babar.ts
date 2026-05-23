import chalk from 'chalk';
import { validatePoints, validateOptions } from './validate.js';
import { computeStats, bucketize, bucketizeCategorical } from './buckets.js';
import { drawChart, drawHorizontalChart } from './draw.js';
import type { AnyPoint, Point, Options, Color } from './types.js';

export type { AnyPoint, Point, Options, Color };
export type { Aggregation, YScale, Direction, CategoricalPoint } from './types.js';

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

function repeat(n: number, ch: string): string {
  if (n <= 0) return '';
  return ch.repeat(n);
}

function isCategorical(points: AnyPoint[]): boolean {
  return typeof points[0][0] === 'string';
}

export default function babar(points: AnyPoint[], options: Options = {}): string {
  validatePoints(points);
  validateOptions(options);

  const color: Color = options.color ?? 'cyan';
  const grid: Color = options.grid ?? 'black';
  const aggregation = options.aggregation ?? 'avg';
  const yScale = options.yScale ?? 'linear';
  const direction = options.direction ?? 'vertical';
  let width = options.width ?? 80;
  let height = options.height ?? 15;
  const caption = options.caption;

  // ── Categorical path ────────────────────────────────────────────────────────
  if (isCategorical(points)) {
    return renderCategorical(points, options, color, grid, aggregation, yScale, direction, width, height, caption);
  }

  // ── Numeric path ────────────────────────────────────────────────────────────
  const numPoints = points as Point[];

  const stats = computeStats(numPoints);
  const minX = options.minX ?? stats.minX;
  const maxX = options.maxX ?? stats.maxX;
  const minY = options.minY;
  const maxY = options.maxY;

  const diffX = maxX - minX;
  const diffY = (maxY ?? stats.maxY) - (minY ?? stats.minY);

  height -= 1 + (caption !== undefined ? 1 : 0);

  const effectiveMinY = minY ?? stats.minY;
  const effectiveMaxY = maxY ?? stats.maxY;

  if (direction === 'horizontal') {
    return renderHorizontalNumeric(
      numPoints, options, color, grid, aggregation, yScale,
      width, height, caption,
      minX, maxX, diffX, stats,
      effectiveMinY, effectiveMaxY, diffY,
    );
  }

  const yFractions = options.yFractions ??
    clamp(0, 8, Math.log(height / (diffY || 1) * 5) / Math.LN10);

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
    numPoints, numBkts, minX, diffX, minY, maxY, height, aggregation, yScale,
  );

  // Y axis labels
  const lblY: string[] = [];
  for (let v = height - 1; v >= 0; v--) {
    const raw = yScale === 'log'
      ? Math.exp(Math.log(Math.max(min, Number.EPSILON)) + Math.log(Math.max(max, Number.EPSILON) / Math.max(min, Number.EPSILON)) * v / Math.max(1, height - 1))
      : min + diff * v / Math.max(1, height - 1);
    lblY.unshift(raw.toFixed(yFractions));
  }

  // refY → normalized row position
  let refRow: number | undefined;
  if (options.refY !== undefined) {
    if (yScale === 'log') {
      const logMin = Math.log(Math.max(min, Number.EPSILON));
      const logMax = Math.log(Math.max(max, Number.EPSILON));
      refRow = (Math.log(Math.max(options.refY, Number.EPSILON)) - logMin) / (logMax - logMin) * (height - 1);
    } else {
      refRow = (options.refY - min) / (diff || 1) * (height - 1);
    }
  }

  // X label density
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

  out += drawChart(height, lblY, lblYW, bkt, bktW, color, grid, refRow) + '\n';
  out += repeat(lblYW, ' ');

  for (let x = 0; x < lblXN; x++) {
    const u = x * lblXI;
    const lbl = (minX + u * (diffX || 0) / Math.max(1, numBkts - 1)).toFixed(xFractions);
    out += lbl;
    out += repeat(bktW * lblXI - lbl.length, ' ');
  }

  return out;
}

// ─── Categorical renderer ────────────────────────────────────────────────────

function renderCategorical(
  points: AnyPoint[],
  options: Options,
  color: Color,
  grid: Color,
  aggregation: import('./types.js').Aggregation,
  yScale: import('./types.js').YScale,
  direction: import('./types.js').Direction,
  width: number,
  height: number,
  caption: string | undefined,
): string {
  const minY = options.minY;
  const maxY = options.maxY;
  const innerH = height - 1 - (caption !== undefined ? 1 : 0);

  const { bkt, labels, min, max, diff } = bucketizeCategorical(
    points, aggregation, yScale, minY, maxY, innerH,
  );

  const yFractions = options.yFractions ?? 1;
  const numBkts = bkt.length;

  if (direction === 'horizontal') {
    const maxLabelW = Math.max(...labels.map(l => l.length));
    const barAreaW = width - maxLabelW - 2 - 8; // 2 for spacing, 8 for value label
    const normalizedBkt = bkt; // already normalized to innerH

    // Re-normalize to barAreaW
    const barWidths = bkt.map(v => v / (innerH || 1) * Math.max(1, barAreaW));

    const valLabels = bkt.map((_, i) => {
      const rawVal = yScale === 'log'
        ? Math.exp(Math.log(Math.max(min, Number.EPSILON)) + bkt[i] / (innerH || 1) * Math.log(Math.max(max, Number.EPSILON) / Math.max(min, Number.EPSILON)))
        : min + (diff || 0) * bkt[i] / (innerH || 1);
      return rawVal.toFixed(yFractions);
    });

    let out = '';
    if (caption !== undefined) {
      out += color === 'ascii' ? caption : chalk.bold(caption);
      out += '\n';
    }
    out += drawHorizontalChart(barWidths, labels, maxLabelW, barAreaW, color, grid, valLabels);
    return out;
  }

  // Vertical categorical
  const lblYW = 1 + Math.max(
    (min).toFixed(yFractions).length,
    (max).toFixed(yFractions).length,
  );
  const availWidth = width - lblYW;
  const bktW = Math.max(1, Math.floor(availWidth / numBkts));

  const lblY: string[] = [];
  for (let v = innerH - 1; v >= 0; v--) {
    const raw = yScale === 'log'
      ? Math.exp(Math.log(Math.max(min, Number.EPSILON)) + Math.log(Math.max(max, Number.EPSILON) / Math.max(min, Number.EPSILON)) * v / Math.max(1, innerH - 1))
      : min + diff * v / Math.max(1, innerH - 1);
    lblY.unshift(raw.toFixed(yFractions));
  }

  let refRow: number | undefined;
  if (options.refY !== undefined) {
    refRow = (options.refY - min) / (diff || 1) * (innerH - 1);
  }

  let out = '';
  if (caption !== undefined) {
    out += repeat(lblYW, ' ');
    out += color === 'ascii' ? caption : chalk.bold(caption);
    out += '\n';
  }

  out += drawChart(innerH, lblY, lblYW, bkt, bktW, color, grid, refRow) + '\n';
  out += repeat(lblYW, ' ');

  // X labels: category names, thinned if they overlap
  const maxLblW = Math.max(...labels.map(l => l.length));
  let step = 1;
  while (step < numBkts && (numBkts / step) * (maxLblW + 1) > numBkts * bktW) step *= 2;

  for (let i = 0; i < numBkts; i += step) {
    const lbl = labels[i].substring(0, bktW * step);
    out += lbl;
    out += repeat(bktW * step - lbl.length, ' ');
  }

  return out;
}

// ─── Horizontal numeric renderer ─────────────────────────────────────────────

function renderHorizontalNumeric(
  points: Point[],
  options: Options,
  color: Color,
  grid: Color,
  aggregation: import('./types.js').Aggregation,
  yScale: import('./types.js').YScale,
  width: number,
  height: number,
  caption: string | undefined,
  minX: number,
  maxX: number,
  diffX: number,
  stats: import('./buckets.js').PointStats,
  effectiveMinY: number,
  effectiveMaxY: number,
  diffY: number,
): string {
  const yFractions = options.yFractions ?? 1;
  const xFractions = options.xFractions ?? 0;

  const numBkts = Math.max(1, Math.min(stats.uniqueX, height));

  // Build X labels first so we can measure the longest one
  const labels: string[] = [];
  for (let u = 0; u < numBkts; u++) {
    labels.push((minX + u * (diffX || 0) / Math.max(1, numBkts - 1)).toFixed(xFractions));
  }
  const maxLabelW = Math.max(...labels.map(l => l.length));
  const valLabelW = Math.max(
    effectiveMinY.toFixed(yFractions).length,
    effectiveMaxY.toFixed(yFractions).length,
  );
  const barAreaW = Math.max(1, width - maxLabelW - 2 - valLabelW - 1);

  const { bkt, min, max, diff } = bucketize(
    points, numBkts, minX, diffX, options.minY, options.maxY, barAreaW + 1, aggregation, yScale,
  );

  // refY → normalized column
  let refCol: number | undefined;
  if (options.refY !== undefined) {
    if (yScale === 'log') {
      const logMin = Math.log(Math.max(min, Number.EPSILON));
      const logMax = Math.log(Math.max(max, Number.EPSILON));
      refCol = (Math.log(Math.max(options.refY, Number.EPSILON)) - logMin) / (logMax - logMin) * barAreaW;
    } else {
      refCol = (options.refY - min) / (diff || 1) * barAreaW;
    }
  }

  // Value labels per bucket
  const valLabels = bkt.map(v => {
    const raw = yScale === 'log'
      ? Math.exp(Math.log(Math.max(min, Number.EPSILON)) + v / barAreaW * Math.log(Math.max(max, Number.EPSILON) / Math.max(min, Number.EPSILON)))
      : min + diff * v / barAreaW;
    return raw.toFixed(yFractions);
  });

  let out = '';
  if (caption !== undefined) {
    out += color === 'ascii' ? caption : chalk.bold(caption);
    out += '\n';
  }
  out += drawHorizontalChart(bkt, labels, maxLabelW, barAreaW, color, grid, valLabels, refCol);
  return out;
}

// Allow `require('babar')` to work directly without `.default`
if (typeof module !== 'undefined') {
  module.exports = babar;
  module.exports.default = babar;
}
