import type babar from '../src/babar';

// Cases of the CoffeeScript branch (feat/modern-deps-and-braille-charts).
// Fixtures rendered by it, never rewritten: match byte for byte.

export interface CoffeeCase {
  name: string;
  points: babar.AnyPoint[] | babar.Series[];
  options: babar.Options;
}

function wave(fn: (x: number) => number): babar.Point[] {
  const points: babar.Point[] = [];
  for (let i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
    points.push([i, fn(i)]);
  }
  return points;
}

const five: babar.Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];

// hourly values over a day, morning and evening peaks
const hour = 3600 * 1000;
function hourly(base: number, morning: number, evening: number): babar.Point[] {
  const points: babar.Point[] = [];
  for (let h = 0; h < 24; h++) {
    points.push([
      Date.UTC(2026, 10, 20) + h * hour,
      Math.round(base + morning * Math.exp(-Math.pow(h - 9, 2) / 8) + evening * Math.exp(-Math.pow(h - 18, 2) / 18)),
    ]);
  }
  return points;
}
const requests = hourly(800, 5200, 1500);
const byService: babar.Series[] = [
  { name: 'checkout', points: hourly(800, 5200, 1500) },
  { name: 'search', points: hourly(300, 1900, 3100) },
];

// its examples/timeseries.js and examples/braille.js, in colour and without
const timeseries: CoffeeCase[] = [
  {
    name: 'timeseries-requests',
    points: requests,
    options: { caption: 'requests per hour', xType: 'time', unit: 'short', summary: true, minY: 0, height: 14 },
  },
  {
    name: 'timeseries-services',
    points: byService,
    options: { caption: 'requests per hour, by service', xType: 'time', unit: 'short', summary: true, minY: 0, height: 16 },
  },
];
const brailleCharts: CoffeeCase[] = [
  {
    name: 'braille-requests',
    points: requests,
    options: { style: 'braille', caption: 'requests per hour', xType: 'time', unit: 'short', minY: 0, height: 12 },
  },
  {
    name: 'braille-services',
    points: byService,
    options: { style: 'braille', caption: 'requests per hour, by service', xType: 'time', unit: 'short', summary: true, minY: 0, height: 14 },
  },
];

const day = 24 * hour;
const start = Date.UTC(2026, 0, 30);
const dates = (count: number, step: number, fn: (i: number) => number): babar.Point[] =>
  Array.from({ length: count }, (_, i) => [new Date(start + i * step), fn(i)]);
const services: babar.Series[] = ['a', 'b', 'c', 'd', 'e'].map((letter, k) => ({
  name: `service-${letter}`,
  points: [[0, 1 + k], [1, 5 - k], [2, 3], [3, k]],
}));

export const coffee: CoffeeCase[] = [
  ...timeseries.flatMap(({ name, points, options }) => [
    { name, points, options },
    { name: `${name}-ascii`, points, options: { ...options, color: 'ascii' as const } },
  ]),
  ...brailleCharts.flatMap(({ name, points, options }) => [
    { name, points, options },
    { name: `${name}-plain`, points, options: { ...options, forceColor: false } },
  ]),
  {
    name: 'braille-averages-cos',
    points: wave(Math.cos),
    options: { style: 'braille', color: 'ascii', width: 60, height: 8 },
  },
  {
    name: 'braille-steep-uneven-summary',
    points: [[0, 0], [1, 10], [2, 0], [3, 10], [3.1, 0], [9, 5]],
    options: { style: 'braille', color: 'ascii', width: 30, height: 6, summary: true },
  },
  {
    name: 'braille-legend-narrow',
    points: services.slice(0, 3),
    options: { style: 'braille', width: 14, height: 8 },
  },
  {
    name: 'time-days-bytes',
    points: dates(20, day / 4, (i) => 3e5 * i * i),
    options: { color: 'ascii', xType: 'time', unit: 'bytes', summary: true, width: 60, height: 9 },
  },
  {
    name: 'time-weeks-percent',
    points: dates(40, day, (i) => 50 + 40 * Math.sin(i / 5)),
    options: { grid: 'grey', xType: 'time', unit: 'percent', width: 60, height: 8, minY: 0, maxY: 100 },
  },
  {
    name: 'custom-formats',
    points: five,
    options: {
      color: 'ascii',
      width: 40,
      height: 6,
      summary: true,
      xFormat: (value) => `d${value}`,
      yFormat: (value) => `${value.toFixed(1)} req/s`,
    },
  },
  { name: 'legend-wraps', points: services, options: { width: 40, height: 9 } },
  {
    name: 'legend-narrow-ascii',
    points: services,
    options: { color: 'ascii', width: 16, height: 9, summary: true },
  },
  // at width 1 the legend is the mark alone, without its space
  {
    name: 'legend-width-1',
    points: services.slice(0, 3),
    options: { width: 1, height: 8, summary: true },
  },
  // inputs that 0.2.3 printed with NaN labels, tiny sizes, unit thresholds
  {
    name: 'flat-braille',
    points: [[1, 5], [2, 5], [3, 5]],
    options: { style: 'braille', color: 'ascii', width: 40, height: 6 },
  },
  {
    name: 'flat-bars',
    points: [[1, 5], [2, 5], [3, 5]],
    options: { unit: 'short', width: 40, height: 6 },
  },
  {
    name: 'single-point-time',
    points: [[Date.UTC(2026, 0, 1, 12), 3]],
    options: { xType: 'time', color: 'ascii', width: 30, height: 5 },
  },
  {
    name: 'single-point-braille',
    points: [[7, 3]],
    options: { style: 'braille', color: 'ascii', width: 30, height: 5, summary: true },
  },
  {
    name: 'no-points-time',
    points: [],
    options: { xType: 'time', color: 'ascii', width: 30, height: 5, summary: true },
  },
  {
    name: 'empty-series-summary',
    points: [{ name: 'a', points: [[1, 1], [2, 2]] }, { name: 'none', points: [] }],
    options: { color: 'ascii', summary: true, width: 50, height: 7 },
  },
  {
    name: 'height-4-summary',
    points: services.slice(0, 2),
    options: { color: 'ascii', summary: true, height: 4 },
  },
  {
    name: 'width-3-series',
    points: services,
    options: { color: 'ascii', width: 3, height: 9 },
  },
  {
    name: 'width-3-braille',
    points: five,
    options: { style: 'braille', color: 'ascii', width: 3, height: 5, caption: 'too long' },
  },
  {
    name: 'unit-rollover-bytes',
    points: [[0, 0], [1, 1048575]],
    options: { color: 'ascii', unit: 'bytes', summary: true, width: 30, height: 4 },
  },
  {
    name: 'unit-rollover-short',
    points: [[0, 0], [1, 999999]],
    options: { color: 'ascii', unit: 'short', summary: true, width: 30, height: 4 },
  },
  {
    name: 'series-without-colours',
    points: services.slice(0, 2),
    options: { forceColor: false, width: 30, height: 7 },
  },
];
