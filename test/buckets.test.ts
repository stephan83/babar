import { describe, it, expect } from 'vitest';
import { computeStats, createBuckets, aggregateBuckets, normalizeBuckets, bucketize } from '../src/buckets.js';
import type { Point } from '../src/types.js';

const pts: Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];

describe('computeStats', () => {
  it('computes correct min/max', () => {
    const s = computeStats(pts);
    expect(s.minX).toBe(0);
    expect(s.maxX).toBe(4);
    expect(s.minY).toBe(1);
    expect(s.maxY).toBe(6);
    expect(s.uniqueX).toBe(5);
  });

  it('counts unique X correctly with duplicates', () => {
    const s = computeStats([[0, 1], [0, 2], [1, 3]]);
    expect(s.uniqueX).toBe(2);
  });
});

describe('createBuckets', () => {
  it('places points in correct buckets', () => {
    const bkts = createBuckets([[0, 1], [4, 6]], 5, 0, 4);
    expect(bkts[0]).toContainEqual([0, 1]);
    expect(bkts[4]).toContainEqual([4, 6]);
  });

  it('handles diffX = 0 (single x value)', () => {
    const bkts = createBuckets([[3, 5], [3, 7]], 3, 3, 0);
    expect(bkts[0].length).toBe(2);
    expect(bkts[1].length).toBe(0);
    expect(bkts[2].length).toBe(0);
  });
});

describe('aggregateBuckets', () => {
  it('averages values correctly', () => {
    const result = aggregateBuckets([[[0, 2], [0, 4]], [[1, 6]]], 'avg');
    expect(result[0]).toBe(3);
    expect(result[1]).toBe(6);
  });

  it('carries forward previous value for empty buckets', () => {
    const result = aggregateBuckets([[[0, 10]], [], [[2, 20]]], 'avg');
    expect(result[1]).toBe(10);
  });
});

describe('normalizeBuckets', () => {
  it('maps min→0, max→h', () => {
    const result = normalizeBuckets([0, 5, 10], 0, 10, 10);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(5);
    expect(result[2]).toBe(10);
  });

  it('returns mid-height for diff=0', () => {
    const result = normalizeBuckets([5, 5, 5], 5, 0, 10);
    expect(result).toEqual([5, 5, 5]);
  });
});

describe('bucketize', () => {
  it('produces normalized bucket array of correct length', () => {
    const { bkt } = bucketize(pts, 5, 0, 4, undefined, undefined, 10);
    expect(bkt.length).toBe(5);
  });

  it('respects maxY override', () => {
    const { max } = bucketize(pts, 5, 0, 4, undefined, 100, 10);
    expect(max).toBe(100);
  });

  it('respects minY override', () => {
    const { min } = bucketize(pts, 5, 0, 4, -10, undefined, 10);
    expect(min).toBe(-10);
  });
});
