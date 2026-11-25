// Babar from TypeScript: tsc checks the options and the points.
// The data is fixed: one value per hour over a day, with a peak at noon.
// Node 22.18 or later runs this file as is: node examples/typescript.mts
import babar, { type Options, type Point, type Series } from '../lib/babar.js';

const start = Date.UTC(2026, 10, 20);
const hour = 3600 * 1000;

function hourly(base: number, peak: number): Point[] {
  return Array.from({ length: 24 }, (_, h): Point => [
    start + h * hour,
    Math.round(base + peak * Math.exp(-((h - 12) ** 2) / 18)),
  ]);
}

const options: Options = {
  caption: 'requests per hour',
  xType: 'time',
  unit: 'short',
  minY: 0,
  width: 72,
  height: 12,
};

console.log(babar(hourly(800, 5200), options));

const series: Series[] = [
  { name: 'api', points: hourly(800, 5200) },
  { name: 'web', points: hourly(300, 2100), color: 'magenta' },
];

console.log(babar(series, { ...options, caption: 'two series', style: 'braille', summary: true }));
