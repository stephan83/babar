import { describe, it, expect } from 'vitest';
import { validatePoints, validateOptions } from '../src/validate.js';

describe('validatePoints', () => {
  it('throws if not an array', () => {
    expect(() => validatePoints('foo')).toThrow(TypeError);
    expect(() => validatePoints(null)).toThrow(TypeError);
    expect(() => validatePoints(42)).toThrow(TypeError);
  });

  it('throws on empty array', () => {
    expect(() => validatePoints([])).toThrow(RangeError);
  });

  it('throws if a point is not a 2-element array', () => {
    expect(() => validatePoints([[1]])).toThrow(TypeError);
    expect(() => validatePoints([1, 2])).toThrow(TypeError);
  });

  it('throws on non-finite values', () => {
    expect(() => validatePoints([[Infinity, 1]])).toThrow(RangeError);
    expect(() => validatePoints([[1, NaN]])).toThrow(RangeError);
  });

  it('accepts valid points', () => {
    expect(() => validatePoints([[0, 0], [1, 1]])).not.toThrow();
    expect(() => validatePoints([[-1, -5.5]])).not.toThrow();
  });
});

describe('validateOptions', () => {
  it('throws on invalid color', () => {
    expect(() => validateOptions({ color: 'purple' as never })).toThrow(TypeError);
  });

  it('throws on invalid grid color', () => {
    expect(() => validateOptions({ grid: 'neon' as never })).toThrow(TypeError);
  });

  it('throws on width < 3', () => {
    expect(() => validateOptions({ width: 2 })).toThrow(RangeError);
  });

  it('throws on height < 3', () => {
    expect(() => validateOptions({ height: 1 })).toThrow(RangeError);
  });

  it('throws if minX >= maxX', () => {
    expect(() => validateOptions({ minX: 5, maxX: 5 })).toThrow(RangeError);
    expect(() => validateOptions({ minX: 6, maxX: 5 })).toThrow(RangeError);
  });

  it('throws if minY >= maxY', () => {
    expect(() => validateOptions({ minY: 10, maxY: 5 })).toThrow(RangeError);
  });

  it('accepts valid options', () => {
    expect(() => validateOptions({ color: 'cyan', grid: 'black', width: 80, height: 15 })).not.toThrow();
    expect(() => validateOptions({})).not.toThrow();
  });
});
