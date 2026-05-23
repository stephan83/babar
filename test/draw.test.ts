import { describe, it, expect } from 'vitest';
import { drawRowLabel, drawRowChart, drawRow, drawChart } from '../src/draw.js';

describe('drawRowLabel', () => {
  it('shows label when it differs from previous row', () => {
    const lblY = ['1.0', '2.0', '3.0'];
    expect(drawRowLabel(1, lblY, 6)).toContain('2.0');
  });

  it('shows empty string when label repeats', () => {
    const lblY = ['1.0', '1.0', '3.0'];
    expect(drawRowLabel(1, lblY, 6)).toBe('     ');
  });

  it('always shows label at row 0', () => {
    const lblY = ['1.0', '1.0'];
    expect(drawRowLabel(0, lblY, 6)).toContain('1.0');
  });
});

describe('drawRowChart', () => {
  it('renders full block for bar body in color mode', () => {
    // v=5, r=2 → row is below bar top → full block
    const result = drawRowChart(2, [5], 2, 'cyan', 'black');
    expect(result).toContain('█');
  });

  it('renders horizontal grid line above bar', () => {
    // v=1, r=3 → row is above bar → full cell filled with grid underscores, no separator
    const result = drawRowChart(3, [1], 2, 'cyan', 'black');
    const stripped = result.replace(/\x1b\[[0-9;]*m/g, '');
    expect(stripped).toMatch(/^_+$/);
    expect(stripped).not.toContain('▏');
    expect(stripped).not.toContain('█');
  });

  it('renders X for ascii fill', () => {
    const result = drawRowChart(0, [5], 2, 'ascii', 'black');
    expect(result).toContain('X');
  });

  it('renders space for ascii above bar', () => {
    const result = drawRowChart(4, [1], 2, 'ascii', 'black');
    expect(result).toBe('  ');
  });

  it('renders partial block at bar cap', () => {
    // v=2.5, r=2 → partial fill (0.5 → ▄)
    const result = drawRowChart(2, [2.5], 2, 'cyan', 'black');
    expect(result).toContain('▄');
  });
});

describe('drawChart', () => {
  it('produces correct number of lines', () => {
    const lblY = ['0', '1', '2', '3', '4'];
    const lines = drawChart(5, lblY, 5, [2, 4, 3], 3, 'cyan', 'black').split('\n');
    expect(lines.length).toBe(5);
  });

  it('renders top-to-bottom (last row is row 0)', () => {
    const lblY = ['0.0', '1.0'];
    const lines = drawChart(2, lblY, 5, [1], 3, 'ascii', 'black').split('\n');
    // row 0 (bottom) should be last line
    expect(lines[lines.length - 1]).toContain('0.0');
  });
});
