import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import babar from '../src/babar';
import { shapes } from './cases';
import { expectFixture } from './expect-fixture';

type Point = babar.Point;
type CategoricalPoint = babar.CategoricalPoint;

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

// Colours are detected from the environment on each call: force them on
const env = { ...process.env };
beforeEach(() => {
  process.env.FORCE_COLOR = '1';
  delete process.env.NO_COLOR;
});
afterEach(() => {
  process.env = { ...env };
});

// ─── Aggregation strategies ───────────────────────────────────────────────────

describe('aggregation strategies', () => {
  // two buckets: avg=4, sum=12, min=2, max=6, last=6, count=3, then 10 or count=1
  const pts: Point[] = [[0, 2], [0, 4], [0, 6], [1, 10]];
  // the value printed at the end of each row of a horizontal chart
  const values = (aggregation?: string): string[] =>
    babar(pts, { aggregation: aggregation as never, direction: 'horizontal', color: 'ascii', yFractions: 0 })
      .split('\n')
      .map((row) => row.split(' ').pop()!);

  it('avg', () => {
    expect(values('avg')).toEqual(['4', '10']);
    expect(values()).toEqual(['4', '10']);
  });

  it('sum', () => {
    expect(values('sum')).toEqual(['12', '10']);
  });

  it('min', () => {
    expect(values('min')).toEqual(['2', '10']);
  });

  it('max', () => {
    expect(values('max')).toEqual(['6', '10']);
  });

  it('last', () => {
    expect(values('last')).toEqual(['6', '10']);
  });

  it('count', () => {
    expect(values('count')).toEqual(['3', '1']);
  });

  it('babar respects aggregation option', () => {
    const pts: Point[] = [[0, 1], [0, 9], [1, 5]];
    const sumResult = strip(babar(pts, { aggregation: 'sum', color: 'ascii', width: 20, height: 5 }));
    const avgResult = strip(babar(pts, { aggregation: 'avg', color: 'ascii', width: 20, height: 5 }));
    expect(sumResult).not.toBe(avgResult);
  });

  it('falls back to the average on an invalid aggregation', () => {
    expect(values('median')).toEqual(values('avg'));
    expect(values('toString')).toEqual(values('avg'));
  });

  it('draws the sums on a y axis that follows them', () => {
    const chart = babar(pts, { aggregation: 'sum', color: 'ascii', width: 24, height: 7, minY: 0 });
    expectFixture('feature-aggregation-sum', chart);
  });

  it('gives a bucket without points a sum and a count of 0, and the value before it otherwise', () => {
    const gap: Point[] = [[0, 3], [1, 5], [9, 7], [10, 2]];
    const rows = (aggregation: babar.Aggregation): string[] =>
      babar(gap, { aggregation, direction: 'horizontal', color: 'ascii', yFractions: 0, height: 4 })
        .split('\n')
        .map((row) => row.split(' ').pop()!);
    expect(rows('sum')).toEqual(['8', '0', '0', '9']);
    expect(rows('count')).toEqual(['2', '0', '0', '2']);
    expect(rows('max')).toEqual(['5', '5', '5', '7']);
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

  it('spaces the powers of ten evenly', () => {
    const chart = babar(pts, { yScale: 'log', color: 'ascii', width: 30, height: 8 });
    expectFixture('feature-log', chart);
  });

  it('is linear when minY <= 0', () => {
    const linear = (minY: number) => babar(pts, { minY, color: 'ascii', refY: 500 });
    expect(babar(pts, { yScale: 'log', minY: 0, color: 'ascii', refY: 500 })).toBe(linear(0));
    expect(babar(pts, { yScale: 'log', minY: -1, color: 'ascii', refY: 500 })).toBe(linear(-1));
  });

  it('is linear when a y value is not positive', () => {
    const withZero: Point[] = [[0, 0], [1, 10], [2, 100]];
    expect(babar(withZero, { yScale: 'log', color: 'ascii', refY: 50 })).toBe(
      babar(withZero, { color: 'ascii', refY: 50 }),
    );
  });

  it('is linear on an invalid yScale value', () => {
    expect(babar(pts, { yScale: 'sqrt' as never, color: 'ascii' })).toBe(babar(pts, { color: 'ascii' }));
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
    expectFixture('feature-ref-y', result);
  });

  it('produces different output than without refY', () => {
    const without = strip(babar(pts, { color: 'ascii', height: 10, width: 40 }));
    const withRef = strip(babar(pts, { refY: 5, color: 'ascii', height: 10, width: 40 }));
    expect(without).not.toBe(withRef);
  });

  it('draws no line on a non-finite refY', () => {
    const without = babar(pts, { color: 'ascii' });
    expect(babar(pts, { refY: NaN, color: 'ascii' })).toBe(without);
    expect(babar(pts, { refY: Infinity, color: 'ascii' })).toBe(without);
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
    expectFixture('feature-categorical', result);
  });

  it('works with aggregation on duplicate labels', () => {
    const dup: CategoricalPoint[] = [['A', 10], ['A', 20], ['B', 5]];
    const avg = strip(babar(dup, { aggregation: 'avg', color: 'ascii' }));
    const sum = strip(babar(dup, { aggregation: 'sum', color: 'ascii' }));
    expect(avg).not.toBe(sum);
  });

  it('takes every x as a label on mixed string/number x types', () => {
    const mixed = babar([['A', 1], [2, 3]] as never, { direction: 'horizontal', color: 'ascii', width: 12 });
    expect(mixed).toBe(['A ...... 1.0', '2 XXXXXX 3.0'].join('\n'));
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
    expectFixture('feature-horizontal-colour', result);
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

  it('is vertical on an invalid direction', () => {
    expect(babar(pts, { direction: 'diagonal' as never, color: 'ascii' })).toBe(babar(pts, { color: 'ascii' }));
  });

  it('refY renders reference column', () => {
    const result = strip(babar(pts, { direction: 'horizontal', refY: 40, color: 'ascii', width: 50 }));
    expect(result).toContain('|');
    expectFixture('feature-horizontal-ref-y', result);
  });

  it('drops the values, then the labels, on a width that has no room for them', () => {
    const months: CategoricalPoint[] = [['Jan', 10], ['Feb', 25], ['Mar', 40]];
    const chart = (width: number) => babar(months, { direction: 'horizontal', color: 'ascii', width });
    expect(chart(6)).toBe(['Jan ..', 'Feb X.', 'Mar XX'].join('\n'));
    expect(chart(3)).toBe(['...', 'XX.', 'XXX'].join('\n'));
  });
});

// ─── Several series ───────────────────────────────────────────────────────────

describe('several series', () => {
  const wave = (shift: number): Point[] => Array.from({ length: 40 }, (_, x) => [x, Math.sin(x / 5 + shift)]);
  const series: babar.Series[] = [{ points: wave(0) }, { points: wave(2), color: 'red' }];

  it('draws one braille line per series, on shared axes', () => {
    const chart = babar(series, { style: 'braille', width: 50, height: 7 });
    expectFixture('feature-series-braille', chart);
  });
});

// ─── Sizes ────────────────────────────────────────────────────────────────────

describe('options added after 0.2.3', () => {
  const months: CategoricalPoint[] = [['Jan', 10], ['Feb', 25], ['Mar', 15], ['Apr', 40], ['May', 30]];
  const added: [string, babar.Options][] = [
    ['aggregation', { aggregation: 'sum' }],
    ['log scale', { yScale: 'log' }],
    ['reference line', { refY: 4 }],
    ['horizontal bars', { direction: 'horizontal', refY: 4 }],
    ['horizontal bars and count', { direction: 'horizontal', aggregation: 'count', yScale: 'log' }],
  ];

  for (const [name, options] of added) {
    it(`fit in the requested width and height: ${name}`, () => {
      for (const [shape, points] of Object.entries({ ...shapes, months })) {
        for (let height = 1; height <= 12; height++) {
          for (let width = 1; width <= 40; width++) {
            for (const caption of [undefined, 'a caption longer than the chart is wide']) {
              const chart = babar(points as never, { ...options, width, height, caption });
              const lines = strip(chart).split('\n');
              const size = { shape, lines: lines.length, columns: Math.max(...lines.map((line) => line.length)) };
              expect(size.lines, JSON.stringify({ width, height, caption, ...size })).toBeLessThanOrEqual(height);
              expect(size.columns, JSON.stringify({ width, height, caption, ...size })).toBeLessThanOrEqual(width);
            }
          }
        }
      }
    });
  }
});
