import type { AnyPoint, Point, Aggregation } from './types.js';

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

export function aggregateBuckets(bkt: Point[][], aggregation: Aggregation): number[] {
  const result: number[] = [];
  let prev = 0;

  for (const values of bkt) {
    if (values.length > 0) {
      switch (aggregation) {
        case 'avg':
          prev = values.reduce((s, p) => s + p[1], 0) / values.length;
          break;
        case 'sum':
          prev = values.reduce((s, p) => s + p[1], 0);
          break;
        case 'min':
          prev = Math.min(...values.map(p => p[1]));
          break;
        case 'max':
          prev = Math.max(...values.map(p => p[1]));
          break;
        case 'last':
          prev = values[values.length - 1][1];
          break;
        case 'count':
          prev = values.length;
          break;
      }
    }
    result.push(prev);
  }

  return result;
}

export function normalizeBuckets(bkt: number[], min: number, diff: number, h: number): number[] {
  if (diff === 0) return bkt.map(() => h / 2);
  return bkt.map(v => (v - min) / diff * h);
}

export function normalizeBucketsLog(bkt: number[], min: number, max: number, h: number): number[] {
  const logMin = Math.log(Math.max(min, Number.EPSILON));
  const logMax = Math.log(Math.max(max, Number.EPSILON));
  const logDiff = logMax - logMin;
  if (logDiff === 0) return bkt.map(() => h / 2);
  return bkt.map(v => {
    const logV = Math.log(Math.max(v, Number.EPSILON));
    return (logV - logMin) / logDiff * h;
  });
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
  aggregation: Aggregation = 'avg',
  yScale: 'linear' | 'log' = 'linear',
): BucketizeResult {
  const raw = aggregateBuckets(createBuckets(points, numBkts, minX, diffX), aggregation);
  let min = Math.min(...raw);
  let max = Math.max(...raw);

  if (maxY !== undefined) max = maxY;
  if (minY !== undefined) min = minY;

  const diff = max - min;

  const normalized = yScale === 'log'
    ? normalizeBucketsLog(raw, min, max, h - 1)
    : normalizeBuckets(raw, min, diff, h - 1);

  return { bkt: normalized, min, max, diff };
}

// ─── Categorical support ─────────────────────────────────────────────────────

export interface CategoricalBucketizeResult {
  bkt: number[];
  labels: string[];
  min: number;
  max: number;
  diff: number;
}

export function bucketizeCategorical(
  points: AnyPoint[],
  aggregation: Aggregation = 'avg',
  yScale: 'linear' | 'log' = 'linear',
  minY?: number,
  maxY?: number,
  h: number = 14,
): CategoricalBucketizeResult {
  // Group by label in insertion order
  const groups = new Map<string, number[]>();
  for (const [x, y] of points) {
    const key = String(x);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(y as number);
  }

  const labels = [...groups.keys()];
  const rawBuckets: Point[][] = labels.map(lbl =>
    groups.get(lbl)!.map(y => [0, y] as Point)
  );

  const raw = aggregateBuckets(rawBuckets, aggregation);
  let min = Math.min(...raw);
  let max = Math.max(...raw);

  if (maxY !== undefined) max = maxY;
  if (minY !== undefined) min = minY;

  const diff = max - min;

  const normalized = yScale === 'log'
    ? normalizeBucketsLog(raw, min, max, h - 1)
    : normalizeBuckets(raw, min, diff, h - 1);

  return { bkt: normalized, labels, min, max, diff };
}
