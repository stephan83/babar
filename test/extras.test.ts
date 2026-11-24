import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import babar from '../src/babar';
import { coffee } from './coffee-cases';
import { expectFixture } from './expect-fixture';

// Colours are detected from the environment on each call: force them on
const env = { ...process.env };
beforeEach(() => {
  process.env.FORCE_COLOR = '1';
  delete process.env.NO_COLOR;
});
afterEach(() => {
  process.env = { ...env };
});

describe('forceColor', () => {
  const points: babar.Point[] = [[1, 1], [2, 2]];
  const coloured = [
    '    \x1b[1mc\x1b[22m',
    '2.0 \x1b[30m_\x1b[39m\x1b[30m_\x1b[39m\x1b[36m_\x1b[39m\x1b[30m_\x1b[39m',
    '1.0 \x1b[36m_\x1b[39m\x1b[30m_\x1b[39m\x1b[7m\x1b[36m \x1b[39m\x1b[27m\x1b[30m_\x1b[39m',
    '    ',
  ].join('\n');
  const uncoloured = ['    c', '2.0 ____', '1.0 __ _', '    '].join('\n');

  it('true emits the ANSI codes whatever the environment says', () => {
    process.env.FORCE_COLOR = '0';
    expect(babar(points, { width: 8, height: 4, caption: 'c', forceColor: true })).toBe(coloured);
  });

  it('false emits none whatever the environment says', () => {
    expect(babar(points, { width: 8, height: 4, caption: 'c', forceColor: false })).toBe(uncoloured);
  });

  it('false draws the vertical bars of the options added after 0.2.3 with the ascii fill', () => {
    expect(babar(points, { width: 12, height: 5, refY: 1.5, forceColor: false })).toBe(
      babar(points, { width: 12, height: 5, refY: 1.5, color: 'ascii' }),
    );
  });

  it('false keeps the braille dots and the eighth blocks, without codes', () => {
    expect(babar(points, { width: 12, height: 3, style: 'braille', forceColor: false })).toBe(
      babar(points, { width: 12, height: 3, style: 'braille', color: 'ascii' }),
    );
    expect(babar(points, { width: 12, direction: 'horizontal', minY: 0, forceColor: false })).toBe(
      ['1.0 ██·· 1.0', '2.0 ████ 2.0'].join('\n'),
    );
  });
});

describe('unit and yFormat', () => {
  const chart = (points: babar.Point[], options: babar.Options): string[] =>
    babar(points, { color: 'ascii', width: 30, height: 5, ...options }).split('\n');

  it("unit: 'short' scales the y labels with k, M, G (fixture of the CoffeeScript branch)", () => {
    expectFixture('flat-bars', babar([[1, 5], [2, 5], [3, 5]], { unit: 'short', width: 40, height: 6 }), false);
    expect(chart([[0, 0], [1, 999999]], { unit: 'short' })).toEqual([
      '    1M                       ',
      '666.7k            XXXXXXXXXXX',
      '333.3k            XXXXXXXXXXX',
      '     0            XXXXXXXXXXX',
      '       0.0        1.0        ',
    ]);
  });

  it("unit: 'bytes' scales by 1024", () => {
    expect(chart([[0, 0], [1, 1048575]], { unit: 'bytes' })).toEqual([
      '    1MiB                     ',
      '682.7KiB           XXXXXXXXXX',
      '341.3KiB           XXXXXXXXXX',
      '      0B           XXXXXXXXXX',
      '         0.0       1.0       ',
    ]);
  });

  it("unit: 'percent' adds a percent sign", () => {
    expect(chart([[0, 10], [1, 50], [2, 90]], { unit: 'percent', minY: 0, maxY: 100 })).toEqual([
      '100%                         ',
      ' 67%                         ',
      ' 33%                 XXXXXXXX',
      '  0%         XXXXXXXXXXXXXXXX',
      '     0       1       2       ',
    ]);
  });

  it('yFormat formats the y labels itself, and wins over the unit', () => {
    const yFormat = (value: number): string => `${value.toFixed(1)} req/s`;
    expect(chart([[0, 10], [1, 50], [2, 90]], { yFormat, unit: 'bytes', width: 40 })).toEqual([
      '90.0 req/s                            ',
      '63.3 req/s                   XXXXXXXXX',
      '36.7 req/s                   XXXXXXXXX',
      '10.0 req/s          XXXXXXXXXXXXXXXXXX',
      '           0        1        2        ',
    ]);
  });

  it('formats the values of horizontal bars too', () => {
    expect(chart([[0, 1200], [1, 50000]], { unit: 'short', direction: 'horizontal' })).toEqual([
      '0.0 ..................... 1.2k',
      '1.0 XXXXXXXXXXXXXXXXXXXXX 50k',
    ]);
  });

  it('ignores an unknown unit and a yFormat that is not a function', () => {
    const points: babar.Point[] = [[0, 10], [1, 50], [2, 90]];
    expect(chart(points, { unit: 'nope' as never, yFormat: 'x' as never })).toEqual(chart(points, { refY: 1e9 }));
  });
});

describe("xType: 'time', utc and xFormat", () => {
  const day = 24 * 3600 * 1000;
  const start = Date.UTC(2026, 0, 30);
  const dates = (count: number, step: number, fn: (i: number) => number): babar.Point[] =>
    Array.from({ length: count }, (_, i) => [new Date(start + i * step), fn(i)]);
  // one value per hour over a day, with a morning peak and a smaller one in the evening
  const hourly = (base: number, morning: number, evening: number): babar.Point[] =>
    Array.from({ length: 24 }, (_, h) => [
      Date.UTC(2026, 10, 20) + h * 3600 * 1000,
      Math.round(base + morning * Math.exp(-((h - 9) ** 2) / 8) + evening * Math.exp(-((h - 18) ** 2) / 18)),
    ]);
  const noon: babar.Point[] = [[Date.UTC(2026, 0, 1, 12), 3]];
  const lastLine = (chart: string): string => chart.split('\n').pop()!.trim();

  // fixtures of the CoffeeScript branch, never rewritten
  it('labels dates as DD/MM over weeks (Date objects, with a unit)', () => {
    const points = dates(40, day, (i) => 50 + 40 * Math.sin(i / 5));
    const options: babar.Options = { grid: 'grey', xType: 'time', unit: 'percent', width: 60, height: 8, minY: 0, maxY: 100 };
    expectFixture('time-weeks-percent', babar(points, options), false);
  });

  it('labels a single point with its time', () => {
    expectFixture('single-point-time', babar(noon, { xType: 'time', color: 'ascii', width: 30, height: 5 }), false);
  });

  it('labels the hours of a day under a braille line (epoch milliseconds)', () => {
    const options: babar.Options = { style: 'braille', caption: 'requests per hour', xType: 'time', unit: 'short', minY: 0, height: 12 };
    expectFixture('braille-requests', babar(hourly(800, 5200, 1500), options), false);
    expectFixture('braille-requests-plain', babar(hourly(800, 5200, 1500), { ...options, forceColor: false }), false);
  });

  it('picks the precision from the x span: time, date and time, date, month', () => {
    const labels = (step: number): string =>
      lastLine(babar(dates(4, step, (i) => i), { xType: 'time', color: 'ascii', width: 60, height: 3 }));
    expect(labels(day / 8)).toBe('00:00         03:00         06:00         09:00');
    expect(labels(day)).toBe('30/01 00:00   31/01 00:00   01/02 00:00   02/02 00:00');
    expect(labels(30 * day)).toBe('30/01         01/03         31/03         30/04');
    expect(labels(200 * day)).toBe('2026-01       2026-08       2027-03       2027-09');
  });

  it('utc: false prints the labels in the local time zone', () => {
    // the time zone is read when the process starts: rendered by the built bundle in a child process
    const label = (utc?: boolean): string =>
      lastLine(
        JSON.parse(
          execFileSync(
            process.execPath,
            [join(__dirname, 'render.cjs'), JSON.stringify([noon, { xType: 'time', utc, color: 'ascii', width: 30, height: 5 }])],
            { env: { TZ: 'Asia/Tokyo' }, encoding: 'utf8' },
          ),
        ),
      );
    expect(label(false)).toBe('21:00');
    expect(label()).toBe('12:00');
  });

  it('xFormat formats the x labels itself, and wins over the time', () => {
    const xFormat = (value: number): string => `d${value}`;
    expect(babar([[0, 1], [1, 2], [2, 3]], { xFormat, xType: 'time', color: 'ascii', width: 30, height: 4 })).toBe(
      ['3                            ', '2                   XXXXXXXXX', '1          XXXXXXXXXXXXXXXXXX', '  d0       d1       d2       '].join('\n'),
    );
  });

  it('labels the rows of horizontal bars', () => {
    expect(babar(dates(3, day / 4, (i) => i), { xType: 'time', direction: 'horizontal', color: 'ascii', width: 24, minY: 0 })).toBe(
      ['00:00 .............. 0.0', '06:00 XXXXXXX....... 1.0', '12:00 XXXXXXXXXXXXXX 2.0'].join('\n'),
    );
  });

  it('does not throw on an x that is not a time, and ignores an unknown xType or an xFormat that is not a function', () => {
    expect(() => babar([[NaN, 1], [new Date('nope'), 2]], { xType: 'time', color: 'ascii', width: 20, height: 4 })).not.toThrow();
    const points: babar.Point[] = [[0, 1], [1, 2]];
    expect(babar(points, { xType: 'nope' as never, xFormat: 5 as never, color: 'ascii', width: 20, height: 4 })).toBe(
      babar(points, { refY: 1e9, color: 'ascii', width: 20, height: 4 }),
    );
  });
});

describe('several series and their legend', () => {
  const services: babar.Series[] = ['a', 'b', 'c', 'd', 'e'].map((letter, k) => ({
    name: `service-${letter}`,
    points: [[0, 1 + k], [1, 5 - k], [2, 3], [3, k]],
  }));

  // fixtures of the CoffeeScript branch, never rewritten
  it('draws one bar per series in each bucket, and a legend that wraps', () => {
    expectFixture('legend-wraps', babar(services, { width: 40, height: 9 }), false);
  });

  it('fills the bars with X, O, #, + and * without colours', () => {
    expectFixture('series-without-colours', babar(services.slice(0, 2), { forceColor: false, width: 30, height: 7 }), false);
  });

  it('only draws the first series on a width smaller than their number', () => {
    expectFixture('width-3-series', babar(services, { color: 'ascii', width: 3, height: 9 }), false);
  });

  it('puts the legend under braille lines too, cut to a narrow width', () => {
    expectFixture('braille-legend-narrow', babar(services.slice(0, 3), { style: 'braille', width: 14, height: 8 }), false);
  });

  it('names the series that have no name, and takes their colours', () => {
    const chart = babar([{ points: [[0, 1], [1, 3]] }, { points: [[0, 2], [1, 1]], color: 'red' }], { width: 16, height: 5 });
    expect(chart.split('\n').slice(-2)).toEqual([
      '    \x1b[34m■\x1b[39m \x1b[90mseries 1\x1b[39m',
      '    \x1b[31m■\x1b[39m \x1b[90mseries 2\x1b[39m',
    ]);
    expect(chart).toContain('\x1b[31m_\x1b[39m');
  });

  it('gives up the legend when it would leave less than two rows to the chart', () => {
    const chart = (height: number): string[] =>
      babar(services.slice(0, 2), { color: 'ascii', width: 20, height }).split('\n');
    expect(chart(3)).toEqual(['5                 ', '0     XO          ', '  0   1   2   3   ']);
    expect(chart(4)).toEqual([...chart(3), '  X service-a']);
    expect(chart(5)).toEqual([...chart(3), '  X service-a', '  O service-b']);
  });

  it('draws the bars of each series with an aggregation, a reference line and a log scale', () => {
    const points: babar.Series[] = [
      { name: 'a', points: [[0, 1], [0, 9], [1, 100]] },
      { name: 'b', points: [[0, 10], [1, 1000]] },
    ];
    expectFixture('series-aggregation-log-ref', babar(points, { aggregation: 'sum', yScale: 'log', refY: 100, color: 'ascii', width: 24, height: 8 }));
  });

  it('draws the first series only as horizontal bars, without legend', () => {
    expect(babar(services, { direction: 'horizontal', color: 'ascii', width: 20, minY: 0 })).toBe(
      babar(services[0].points, { direction: 'horizontal', color: 'ascii', width: 20, minY: 0 }),
    );
  });

  it('takes an entry that is not a series as a series without points', () => {
    expect(() => babar([services[0], null, 5, [0, 1], {}] as never, { color: 'ascii', width: 30, height: 8 })).not.toThrow();
  });
});

describe('summary', () => {
  const five: babar.Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];
  const chart = (options: babar.Options): string[] =>
    babar(five, { summary: true, color: 'ascii', width: 30, height: 6, ...options }).split('\n');

  it('prints the min, avg and max of the points under the chart, on a line taken from the height', () => {
    expect(chart({})).toEqual([
      '6                          ',
      '4                     XXXXX',
      '3      XXXXXXXXXX     XXXXX',
      '1      XXXXXXXXXX     XXXXX',
      '  0    1    2    3    4    ',
      '  min 1  avg 4  max 6',
    ]);
  });

  it('drops the max, then the avg, on a width they do not fit in', () => {
    expect(chart({ width: 12 }).pop()).toBe('min 1  avg 4');
    expect(chart({ width: 6 }).pop()).toBe(' min 1');
  });

  it('gives up the summary when it would leave less than two rows to the chart', () => {
    expect(chart({ height: 3 })).toEqual(['6                          ', '1      XXXXXXXXXX     XXXXX', '  0    1    2    3    4    ']);
  });

  it('formats its values like the y labels', () => {
    expect(chart({ unit: 'percent' }).pop()).toBe('   min 1%  avg 4%  max 6%');
  });

  it('is not printed under horizontal bars', () => {
    expect(chart({ direction: 'horizontal' })).toEqual(
      babar(five, { direction: 'horizontal', color: 'ascii', width: 30, height: 6 }).split('\n'),
    );
  });
});

describe('charts of the CoffeeScript branch', () => {
  // rendered by that branch: never rewritten
  for (const { name, points, options } of coffee) {
    it(`renders ${name} as it did`, () => {
      expectFixture(name, babar(points, options), false);
    });
  }
});
