import type { AnyPoint, Options, Color, Aggregation, YScale, Direction } from './types.js';

const VALID_COLORS: Color[] = [
  'ascii', 'black', 'red', 'green', 'yellow',
  'blue', 'magenta', 'cyan', 'white', 'grey', 'gray',
];

const VALID_AGGREGATIONS: Aggregation[] = ['avg', 'sum', 'min', 'max', 'last', 'count'];
const VALID_YSCALES: YScale[] = ['linear', 'log'];
const VALID_DIRECTIONS: Direction[] = ['vertical', 'horizontal'];

export function validatePoints(points: unknown): asserts points is AnyPoint[] {
  if (!Array.isArray(points)) {
    throw new TypeError('babar: points must be an array');
  }
  if (points.length === 0) {
    throw new RangeError('babar: points array must not be empty');
  }
  const firstType = typeof points[0]?.[0];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Array.isArray(p) || p.length < 2) {
      throw new TypeError(`babar: points[${i}] must be a [x, y] array`);
    }
    if (typeof p[0] !== firstType) {
      throw new TypeError(`babar: all points must have the same x type (mixed string/number)`);
    }
    if (typeof p[0] === 'number' && !Number.isFinite(p[0])) {
      throw new RangeError(`babar: points[${i}] x value is non-finite`);
    }
    if (!Number.isFinite(p[1])) {
      throw new RangeError(`babar: points[${i}] y value is non-finite`);
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
  if (opts.minX !== undefined && opts.maxX !== undefined && opts.minX >= opts.maxX) {
    throw new RangeError('babar: minX must be less than maxX');
  }
  if (opts.minY !== undefined && opts.maxY !== undefined && opts.minY >= opts.maxY) {
    throw new RangeError('babar: minY must be less than maxY');
  }
  if (opts.aggregation !== undefined && !VALID_AGGREGATIONS.includes(opts.aggregation)) {
    throw new TypeError(
      `babar: invalid aggregation "${opts.aggregation}". Valid values: ${VALID_AGGREGATIONS.join(', ')}`
    );
  }
  if (opts.yScale !== undefined && !VALID_YSCALES.includes(opts.yScale)) {
    throw new TypeError(
      `babar: invalid yScale "${opts.yScale}". Valid values: ${VALID_YSCALES.join(', ')}`
    );
  }
  if (opts.yScale === 'log' && opts.minY !== undefined && opts.minY <= 0) {
    throw new RangeError('babar: minY must be > 0 when yScale is "log"');
  }
  if (opts.direction !== undefined && !VALID_DIRECTIONS.includes(opts.direction)) {
    throw new TypeError(
      `babar: invalid direction "${opts.direction}". Valid values: ${VALID_DIRECTIONS.join(', ')}`
    );
  }
  if (opts.refY !== undefined && !Number.isFinite(opts.refY)) {
    throw new RangeError('babar: refY must be a finite number');
  }
}
