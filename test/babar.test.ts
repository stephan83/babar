import { describe, it, expect } from 'vitest';
import babar from '../src/babar.js';
import type { Point } from '../src/types.js';

const pts: Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];

describe('babar (integration)', () => {
  it('returns a non-empty string', () => {
    const result = babar(pts);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('output has expected number of lines (height + x labels)', () => {
    const height = 10;
    const result = babar(pts, { height, color: 'ascii' });
    const lines = result.split('\n');
    // height - 1 (x label row) - 1 (caption adjustment) = 8 chart rows + 1 x-label trailing line
    // Actual: height param = 10, internal = 10 - 1 = 9 chart rows + '\n' + x-label (no trailing \n)
    expect(lines.length).toBeGreaterThanOrEqual(height - 2);
  });

  it('includes caption when provided', () => {
    const result = babar(pts, { caption: 'My Chart', color: 'ascii' });
    expect(result).toContain('My Chart');
  });

  it('ascii mode uses X characters for bars', () => {
    const result = babar([[0, 5], [1, 5]], { color: 'ascii', width: 20, height: 5 });
    expect(result).toContain('X');
  });

  it('handles single point', () => {
    expect(() => babar([[0, 42]])).not.toThrow();
  });

  it('handles all same Y values (diff=0)', () => {
    expect(() => babar([[0, 5], [1, 5], [2, 5]])).not.toThrow();
  });

  it('handles single unique X (diffX=0)', () => {
    expect(() => babar([[3, 1], [3, 2], [3, 5]])).not.toThrow();
  });

  it('respects minY/maxY clipping', () => {
    const result = babar(pts, { minY: 0, maxY: 10, color: 'ascii' });
    expect(result).toContain('0');
    expect(result).toContain('10');
  });

  it('renders negative Y values', () => {
    expect(() => babar([[-1, -5], [0, 0], [1, 5]])).not.toThrow();
  });

  it('fits within specified width', () => {
    const width = 40;
    const result = babar(pts, { width, color: 'ascii' });
    // strip ANSI, check line widths
    const lines = result.split('\n').filter(l => l.length > 0);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(width + 2); // small tolerance for label overflow
    }
  });

  it('throws on empty points', () => {
    expect(() => babar([])).toThrow(RangeError);
  });

  it('throws on invalid color', () => {
    expect(() => babar(pts, { color: 'purple' as never })).toThrow(TypeError);
  });

  it('throws on non-finite point', () => {
    expect(() => babar([[NaN, 1]])).toThrow(RangeError);
  });

  it('throws on too-small height', () => {
    expect(() => babar(pts, { height: 1 })).toThrow(RangeError);
  });
});

describe('babar partial bar resolution', () => {
  it('uses sub-row block characters in color mode', () => {
    // One tall bar should produce characters from the block set
    const result = babar([[0, 0], [1, 10]], { color: 'cyan', width: 20, height: 10 });
    const blockChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const hasBlock = blockChars.some(ch => result.includes(ch));
    expect(hasBlock).toBe(true);
  });
});
