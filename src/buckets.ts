import type { Point } from './types.js';

export interface PointStats {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  uniqueX: number;
}

export function computeStats(points: Point[]): PointStats {
  const seenX = new Set<number>();
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of points) {
    seenX.add(x);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { minX, maxX, minY, maxY, uniqueX: seenX.size };
}

export function createBuckets(
  points: Point[],
  numBkts: number,
  minX: number,
  diffX: number,
): Point[][] {
  const bkt: Point[][] = Array.from({ length: numBkts }, () => []);

  for (const p of points) {
    const u = diffX === 0
      ? 0
      : Math.min(numBkts - 1, Math.floor((p[0] - minX) / diffX * numBkts));
    bkt[u].push(p);
  }

  return bkt;
}

export function avgBuckets(bkt: Point[][]): number[] {
  const result: number[] = [];
  let prev = 0;

  for (const values of bkt) {
    if (values.length > 0) {
      prev = values.reduce((sum, p) => sum + p[1], 0) / values.length;
    }
    result.push(prev);
  }

  return result;
}

export function normalizeBuckets(bkt: number[], min: number, diff: number, h: number): number[] {
  if (diff === 0) return bkt.map(() => h / 2);
  return bkt.map(v => (v - min) / diff * h);
}

export interface BucketizeResult {
  bkt: number[];
  min: number;
  max: number;
  diff: number;
}

export function bucketize(
  points: Point[],
  numBkts: number,
  minX: number,
  diffX: number,
  minY: number | undefined,
  maxY: number | undefined,
  h: number,
): BucketizeResult {
  const raw = avgBuckets(createBuckets(points, numBkts, minX, diffX));
  let min = Math.min(...raw);
  let max = Math.max(...raw);

  if (maxY !== undefined) max = maxY;
  if (minY !== undefined) min = minY;

  const diff = max - min;
  return { bkt: normalizeBuckets(raw, min, diff, h - 1), min, max, diff };
}
