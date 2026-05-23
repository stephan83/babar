import { describe, it, expect } from 'vitest';
import babar from '../src/babar.js';
import { aggregateBuckets } from '../src/buckets.js';
import type { Point, CategoricalPoint } from '../src/types.js';

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

// ─── Aggregation strategies ───────────────────────────────────────────────────

describe('aggregation strategies', () => {
  const bkt: Point[][] = [
    [[0, 2], [0, 4], [0, 6]],   // avg=4, sum=12, min=2, max=6, last=6, count=3
    [[1, 10]],                   // avg=10, sum=10, min=10, max=10, last=10, count=1
  ];

  it('avg', () => {
    const r = aggregateBuckets(bkt, 'avg');
    expect(r[0]).toBeCloseTo(4);
    expect(r[1]).toBeCloseTo(10);
  });

  it('sum', () => {
    const r = aggregateBuckets(bkt, 'sum');
    expect(r[0]).toBeCloseTo(12);
    expect(r[1]).toBeCloseTo(10);
  });

  it('min', () => {
    const r = aggregateBuckets(bkt, 'min');
    expect(r[0]).toBe(2);
    expect(r[1]).toBe(10);
  });

  it('max', () => {
    const r = aggregateBuckets(bkt, 'max');
    expect(r[0]).toBe(6);
    expect(r[1]).toBe(10);
  });

  it('last', () => {
    const r = aggregateBuckets(bkt, 'last');
    expect(r[0]).toBe(6);
    expect(r[1]).toBe(10);
  });

  it('count', () => {
    const r = aggregateBuckets(bkt, 'count');
    expect(r[0]).toBe(3);
    expect(r[1]).toBe(1);
  });

  it('babar respects aggregation option', () => {
    const pts: Point[] = [[0, 1], [0, 9], [1, 5]];
    const sumResult = strip(babar(pts, { aggregation: 'sum', color: 'ascii', width: 20, height: 5 }));
    const avgResult = strip(babar(pts, { aggregation: 'avg', color: 'ascii', width: 20, height: 5 }));
    expect(sumResult).not.toBe(avgResult);
  });

  it('throws on invalid aggregation', () => {
    expect(() => babar([[0, 1]], { aggregation: 'median' as never })).toThrow(TypeError);
  });
});

// ─── Log scale ────────────────────────────────────────────────────────────────

describe('yScale: log', () => {
  const pts: Point[] = [[0, 1], [1, 10], [2, 100], [3, 1000]];

  it('renders without throwing', () => {
    expect(() => babar(pts, { yScale: 'log', color: 'ascii' })).not.toThrow();
  });

  it('produces different output than linear for exponential data', () => {
    const linear = strip(babar(pts, { yScale: 'linear', color: 'ascii', height: 8 }));
    const log    = strip(babar(pts, { yScale: 'log',    color: 'ascii', height: 8 }));
    expect(linear).not.toBe(log);
  });

  it('throws when minY <= 0', () => {
    expect(() => babar(pts, { yScale: 'log', minY: 0 })).toThrow(RangeError);
    expect(() => babar(pts, { yScale: 'log', minY: -1 })).toThrow(RangeError);
  });

  it('throws on invalid yScale value', () => {
    expect(() => babar(pts, { yScale: 'sqrt' as never })).toThrow(TypeError);
  });
});

// ─── Reference line ───────────────────────────────────────────────────────────

describe('refY reference line', () => {
  const pts: Point[] = [[0, 0], [1, 5], [2, 10]];

  it('renders without throwing', () => {
    expect(() => babar(pts, { refY: 5, color: 'ascii' })).not.toThrow();
  });

  it('includes dashes in ascii mode at ref row', () => {
    const result = strip(babar(pts, { refY: 5, color: 'ascii', height: 8, width: 40 }));
    expect(result).toContain('-');
  });

  it('produces different output than without refY', () => {
    const without = strip(babar(pts, { color: 'ascii', height: 10, width: 40 }));
    const withRef = strip(babar(pts, { refY: 5, color: 'ascii', height: 10, width: 40 }));
    expect(without).not.toBe(withRef);
  });

  it('throws on non-finite refY', () => {
    expect(() => babar(pts, { refY: NaN })).toThrow(RangeError);
    expect(() => babar(pts, { refY: Infinity })).toThrow(RangeError);
  });

  it('works with color mode (╌ character)', () => {
    const result = babar(pts, { refY: 5, color: 'cyan', height: 8, width: 40 });
    expect(strip(result)).toContain('╌');
  });
});

// ─── Categorical X axis ───────────────────────────────────────────────────────

describe('categorical x axis', () => {
  const pts: CategoricalPoint[] = [
    ['Jan', 10], ['Feb', 25], ['Mar', 15], ['Apr', 40], ['May', 30],
  ];

  it('renders without throwing', () => {
    expect(() => babar(pts, { color: 'ascii' })).not.toThrow();
  });

  it('includes category names in output', () => {
    const result = strip(babar(pts, { color: 'ascii', width: 60, height: 10 }));
    expect(result).toContain('Jan');
    expect(result).toContain('Apr');
  });

  it('works with aggregation on duplicate labels', () => {
    const dup: CategoricalPoint[] = [['A', 10], ['A', 20], ['B', 5]];
    const avg = strip(babar(dup, { aggregation: 'avg', color: 'ascii' }));
    const sum = strip(babar(dup, { aggregation: 'sum', color: 'ascii' }));
    expect(avg).not.toBe(sum);
  });

  it('throws on mixed string/number x types', () => {
    expect(() => babar([['A', 1], [2, 3]] as never)).toThrow(TypeError);
  });

  it('works horizontally', () => {
    const result = strip(babar(pts, { direction: 'horizontal', color: 'ascii', width: 60 }));
    expect(result).toContain('Jan');
    expect(result).toContain('X'); // ascii fill char
  });
});

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

describe('direction: horizontal', () => {
  const pts: Point[] = [[0, 10], [1, 50], [2, 30], [3, 80], [4, 20]];

  it('renders without throwing', () => {
    expect(() => babar(pts, { direction: 'horizontal', color: 'ascii' })).not.toThrow();
  });

  it('uses horizontal block characters in color mode', () => {
    const result = babar(pts, { direction: 'horizontal', color: 'cyan', width: 50, height: 10 });
    const blockChars = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
    const stripped = strip(result);
    const hasBlock = blockChars.some(ch => stripped.includes(ch));
    expect(hasBlock).toBe(true);
  });

  it('produces different layout from vertical', () => {
    const vert = strip(babar(pts, { direction: 'vertical', color: 'ascii', width: 50, height: 10 }));
    const horiz = strip(babar(pts, { direction: 'horizontal', color: 'ascii', width: 50, height: 10 }));
    expect(vert).not.toBe(horiz);
  });

  it('includes a caption when provided', () => {
    const result = strip(babar(pts, { direction: 'horizontal', caption: 'My H Chart', color: 'ascii' }));
    expect(result).toContain('My H Chart');
  });

  it('throws on invalid direction', () => {
    expect(() => babar(pts, { direction: 'diagonal' as never })).toThrow(TypeError);
  });

  it('refY renders reference column', () => {
    const result = strip(babar(pts, { direction: 'horizontal', refY: 40, color: 'ascii', width: 50 }));
    expect(result).toContain('|');
  });
});
