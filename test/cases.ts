import type babar from '../src/babar';

// Inputs of the rendering tests. The expected output of a case is the file
// test/fixtures/<name>.txt.

export interface Case {
  name: string;
  points: babar.Point[];
  options?: babar.Options | null;
}

function wave(fn: (x: number) => number): babar.Point[] {
  const points: babar.Point[] = [];
  for (let i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
    points.push([i, fn(i)]);
  }
  return points;
}

const five: babar.Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];
const thirty: babar.Point[] = Array.from({ length: 30 }, (_, x) => [x, Math.sin(x / 4) * 50 + 60]);

// 0.2.3 output (coffeescript 1.6.3, colors 1.4.0): never change
export const legacy: Case[] = [
  { name: 'legacy-default', points: five, options: undefined },
  {
    name: 'legacy-green-grey-small',
    points: five,
    options: { color: 'green', grid: 'grey', width: 40, height: 10, yFractions: 1 },
  },
  {
    name: 'legacy-tall',
    points: [[0, 98], [1, 101], [2, 102], [3, 105], [4, 107], [5, 200], [6, 0]],
    options: { color: 'green', grid: 'grey', height: 22 },
  },
  {
    name: 'legacy-min-max-y',
    points: [
      [0, 0], [1, 98], [2, 100], [3, 101], [4, 102], [5, 103], [6, 105],
      [7, 106], [8, 107], [9, 108], [10, 200],
    ],
    options: { color: 'green', grid: 'grey', height: 10, minY: 80, maxY: 120 },
  },
  {
    name: 'legacy-max-y',
    points: [[0, 9], [1, 20], [2, 33], [3, 20], [4, 12], [5, 10], [6, 63], [7, 21]],
    options: { width: 80, grid: 'blue', height: 10, color: 'yellow', maxY: 100 },
  },
  { name: 'legacy-ascii-cos', points: wave(Math.cos), options: { color: 'ascii' } },
  {
    name: 'legacy-caption-cos',
    points: wave(Math.cos),
    options: { color: 'green', grid: 'grey', caption: 'y = cos(x)' },
  },
  {
    name: 'legacy-ascii-caption-sin',
    points: wave(Math.sin),
    options: { color: 'ascii', caption: 'y = sin(x)' },
  },
  {
    name: 'legacy-min-max-x',
    points: five,
    options: { color: 'ascii', minX: -1, maxX: 6, xFractions: 0, width: 30, height: 8 },
  },
  // style names of colors 1.4.0 other than the plain colours
  {
    name: 'legacy-bg-red',
    points: [[1, 1], [2, 2]],
    options: { color: 'bgRed', width: 20, height: 4 },
  },
  {
    name: 'legacy-bright-on-bg-grid',
    points: five,
    options: { color: 'brightYellow', grid: 'bgBlue', width: 30, height: 6, caption: 'bright' },
  },
  {
    name: 'legacy-strikethrough-old-bg',
    points: five,
    options: { color: 'strikethrough', grid: 'blackBG', width: 30, height: 6 },
  },
  // degenerate inputs: 0.2.3 output kept, NaN labels included
  { name: 'legacy-height-1', points: thirty, options: { height: 1, width: 10 } },
  { name: 'legacy-height-2-caption', points: thirty, options: { height: 2, width: 80, caption: 'c' } },
  { name: 'legacy-height-2-ascii', points: thirty, options: { height: 2, width: 12, color: 'ascii' } },
  { name: 'legacy-empty', points: [], options: { width: 40, height: 10 } },
  { name: 'legacy-one-point', points: [[5, 3]], options: { width: 20, height: 4 } },
  { name: 'legacy-flat', points: [[1, 5], [2, 5], [3, 5]], options: { width: 30, height: 5 } },
  // not styles: 0.2.3 did '_'[name], printing commas or "undefined"
  {
    name: 'legacy-unknown-grid',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { grid: 'ascii' as never, width: 12, height: 5 },
  },
  {
    name: 'legacy-unknown-color',
    points: [[1, 1], [2, 2], [3, 2]],
    options: { color: 'nope' as never, width: 12, height: 8, maxY: 20 },
  },
  {
    name: 'legacy-property-names',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { color: 'length' as never, grid: 'toString' as never, width: 12, height: 5 },
  },
  // points that are not arrays have no x and no y, null is no options
  { name: 'legacy-points-not-arrays', points: [1, 2, 3] as never, options: { width: 20, height: 5 } },
  { name: 'legacy-options-null', points: [[0, 1], [1, 5]], options: null },
  // a caption that is not a string has no bold style to read: "undefined"
  {
    name: 'legacy-caption-not-a-string',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { caption: 0 as never, width: 12, height: 5 },
  },
  // zebra: no change; rainbow: red unless a space
  {
    name: 'legacy-zebra-grid',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { grid: 'zebra' as never, width: 12, height: 5 },
  },
  {
    name: 'legacy-rainbow-color',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { color: 'rainbow' as never, width: 12, height: 5 },
  },
  // names every string has: 0.2.3 printed the source of the function, or nothing
  {
    name: 'legacy-inherited-names',
    points: [[1, 1], [2, 2], [3, 9]],
    options: { color: 'constructor' as never, grid: '__proto__' as never, width: 12, height: 5 },
  },
  // sizes that are not whole numbers: one row for a height of 2.5, an empty line for no row
  { name: 'legacy-fractional-height', points: five, options: { height: 2.5, width: 30, color: 'ascii' } },
  { name: 'legacy-height-nan', points: five, options: { height: NaN, width: 30, color: 'ascii' } },
];

// Braille lines. First three fixtures from the CoffeeScript implementation.
export const braille: Case[] = [
  {
    name: 'braille-averages-cos',
    points: wave(Math.cos),
    options: { style: 'braille', color: 'ascii', width: 60, height: 8 },
  },
  {
    name: 'flat-braille',
    points: [[1, 5], [2, 5], [3, 5]],
    options: { style: 'braille', color: 'ascii', width: 40, height: 6 },
  },
  {
    name: 'width-3-braille',
    points: five,
    options: { style: 'braille', color: 'ascii', width: 3, height: 5, caption: 'too long' },
  },
  {
    name: 'braille-colour-caption',
    points: five,
    options: { style: 'braille', color: 'magenta', width: 30, height: 7, caption: 'five points' },
  },
  // fewer points than dots are joined, a steep change leaves no gap
  {
    name: 'braille-steep-uneven',
    points: [[0, 0], [1, 10], [2, 0], [3, 10], [3.1, 0], [9, 5]],
    options: { style: 'braille', color: 'ascii', width: 30, height: 6 },
  },
  // values outside minY..maxY stay on the edge dots, points outside minX..maxX are ignored
  {
    name: 'braille-clipped',
    points: thirty,
    options: { style: 'braille', color: 'ascii', width: 40, height: 6, minX: 5, maxX: 20, minY: 40, maxY: 100 },
  },
  // inputs that the bars of 0.2.3 print with NaN labels
  { name: 'braille-empty', points: [], options: { style: 'braille', color: 'ascii', width: 30, height: 5 } },
  { name: 'braille-one-point', points: [[7, 3]], options: { style: 'braille', color: 'ascii', width: 30, height: 5 } },
  // a small height drops the caption, then the x labels
  {
    name: 'braille-height-2-caption',
    points: thirty,
    options: { style: 'braille', color: 'ascii', width: 30, height: 2, caption: 'dropped' },
  },
  { name: 'braille-height-1', points: thirty, options: { style: 'braille', color: 'ascii', width: 30, height: 1 } },
  // sizes are whole numbers: 30.9 by 4.9 is 30 by 4
  {
    name: 'braille-fractional-size',
    points: thirty,
    options: { style: 'braille', color: 'ascii', width: 30.9, height: 4.9, caption: 'kept' },
  },
  {
    name: 'braille-fractions',
    points: five,
    options: { style: 'braille', color: 'ascii', width: 40, height: 5, xFractions: 2, yFractions: 1 },
  },
];

// Inputs of the size checks
export const shapes: Record<string, babar.Point[]> = {
  empty: [],
  one: [[5, 3]],
  flat: [[1, 5], [2, 5], [3, 5]],
  five,
  thirty,
  negative: [[-3, -20000], [0, 0.5], [2, 123456.789]],
};
