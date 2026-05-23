import type { Point, Options, Color } from './types.js';

const VALID_COLORS: Color[] = [
  'ascii', 'black', 'red', 'green', 'yellow',
  'blue', 'magenta', 'cyan', 'white', 'grey', 'gray',
];

export function validatePoints(points: unknown): asserts points is Point[] {
  if (!Array.isArray(points)) {
    throw new TypeError('babar: points must be an array');
  }
  if (points.length === 0) {
    throw new RangeError('babar: points array must not be empty');
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Array.isArray(p) || p.length < 2) {
      throw new TypeError(`babar: points[${i}] must be a [x, y] array`);
    }
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      throw new RangeError(`babar: points[${i}] contains non-finite value`);
    }
  }
}

export function validateOptions(opts: Options): void {
  if (opts.color !== undefined && !VALID_COLORS.includes(opts.color)) {
    throw new TypeError(
      `babar: invalid color "${opts.color}". Valid values: ${VALID_COLORS.join(', ')}`
    );
  }
  if (opts.grid !== undefined && !VALID_COLORS.includes(opts.grid)) {
    throw new TypeError(
      `babar: invalid grid color "${opts.grid}". Valid values: ${VALID_COLORS.join(', ')}`
    );
  }
  if (opts.width !== undefined && opts.width < 3) {
    throw new RangeError('babar: width must be at least 3');
  }
  if (opts.height !== undefined && opts.height < 3) {
    throw new RangeError('babar: height must be at least 3');
  }
  if (
    opts.minX !== undefined &&
    opts.maxX !== undefined &&
    opts.minX >= opts.maxX
  ) {
    throw new RangeError('babar: minX must be less than maxX');
  }
  if (
    opts.minY !== undefined &&
    opts.maxY !== undefined &&
    opts.minY >= opts.maxY
  ) {
    throw new RangeError('babar: minY must be less than maxY');
  }
}
