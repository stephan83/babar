import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import babar from '../src/babar';
import { braille, legacy, shapes } from './cases';
import { expectFixture } from './expect-fixture';

const plain = (text: string): string => text.replace(/\x1b\[\d+m/g, '');
const size = (chart: string): { lines: number; columns: number } => {
  const lines = plain(chart).split('\n');
  return { lines: lines.length, columns: Math.max(...lines.map((line) => line.length)) };
};

// colour detection reads the env on each call: force it on
const env = { ...process.env };
beforeEach(() => {
  process.env.FORCE_COLOR = '1';
  delete process.env.NO_COLOR;
});
afterEach(() => {
  process.env = { ...env };
});

describe('options of 0.2.3', () => {
  // the fixtures are the reference and are never rewritten from here
  for (const { name, points, options } of legacy) {
    it(`renders ${name} as 0.2.3 did`, () => {
      expectFixture(name, babar(points, options), false);
    });
  }

  it("renders the same chart with an explicit style: 'bars'", () => {
    expect(babar(shapes.five, { style: 'bars', width: 30, height: 6 })).toBe(
      babar(shapes.five, { width: 30, height: 6 }),
    );
  });

  it('draws the rows 0.2.3 drew for a height of 0', () => {
    expect(babar(shapes.five, { width: 12, height: 0, color: 'ascii' })).toBe(
      ['  XX    XX  ', '  XX    XX  ', '1           ', '  0 1 2 3 4 '].join('\n'),
    );
  });

  it('draws what 0.2.3 drew for a fractional width', () => {
    expect(babar(shapes.five, { width: 12.5, height: 4, color: 'ascii' })).toBe(
      ['6           ', '4         XX', '1   XXXX  XX', '  0 1 2 3 4 '].join('\n'),
    );
  });

  it('throws a TypeError that says so when the points are not an array', () => {
    for (const points of [undefined, null, 'abc', 5, {}]) {
      expect(() => babar(points as never)).toThrow(new TypeError('babar: points must be an array of [x, y]'));
    }
  });
});

describe('sizes too small for a chart, where 0.2.3 hung', () => {
  it('returns the y labels alone on a width they fill', () => {
    expect(babar(shapes.five, { width: 1, height: 4, color: 'ascii' })).toBe(
      ['6 ', '4 ', '1 ', '  0'].join('\n'),
    );
  });

  it('returns a chart without x labels when not even one fits', () => {
    expect(babar(shapes.five, { width: 7, height: 3, color: 'ascii', xFractions: 3 })).toBe(
      ['6      ', '1  XX X', '  '].join('\n'),
    );
  });
});

describe('sizes that are not finite, or huge', () => {
  // the chart is as wide as its buckets: a few columns less than the limit
  const expectSize = (options: babar.Options, lines: number, columns: number): void => {
    const got = size(babar(shapes.five, { color: 'ascii', ...options }));
    expect(got.lines).toBe(lines);
    expect(got.columns).toBeLessThanOrEqual(columns);
    expect(got.columns).toBeGreaterThan(columns - 5);
  };

  it('limits the bars to 1000 columns and 1000 lines', () => {
    expectSize({ width: Infinity, height: 5 }, 5, 1000);
    expectSize({ width: 1e7, height: 5 }, 5, 1000);
    expectSize({ width: 20, height: Infinity }, 1000, 20);
  });

  it('returns a chart for a width of -Infinity, where 0.2.3 hung', () => {
    expect(babar(shapes.five, { width: -Infinity, height: 3, color: 'ascii' })).toBe(
      babar(shapes.five, { width: -1000, height: 3, color: 'ascii' }),
    );
  });

  it('limits a braille chart to 1000 columns and 1000 lines', () => {
    expectSize({ style: 'braille', width: Infinity, height: 5 }, 5, 1000);
    expectSize({ style: 'braille', width: 1e7, height: 5 }, 5, 1000);
    expectSize({ style: 'braille', width: 20, height: Infinity }, 1000, 20);
  });

  it('draws a braille chart of the default size when a size is not a number', () => {
    const options = { style: 'braille', color: 'ascii' } as const;
    expect(babar(shapes.five, { ...options, width: NaN, height: NaN })).toBe(babar(shapes.five, options));
    expectSize({ style: 'braille', height: NaN }, 15, 80);
  });

  it('draws a braille chart of 1 by 1 for sizes of 0, negative or -Infinity', () => {
    for (const tiny of [0, -3, -Infinity]) {
      expect(size(babar(shapes.five, { style: 'braille', color: 'ascii', width: tiny, height: tiny }))).toEqual({ lines: 1, columns: 1 });
    }
  });
});

describe('colour detection', () => {
  const chart = (): string => babar([[1, 1], [2, 2]], { width: 8, height: 4, caption: 'c' });
  const coloured = [
    '    \x1b[1mc\x1b[22m',
    '2.0 \x1b[30m_\x1b[39m\x1b[30m_\x1b[39m\x1b[36m_\x1b[39m\x1b[30m_\x1b[39m',
    '1.0 \x1b[36m_\x1b[39m\x1b[30m_\x1b[39m\x1b[7m\x1b[36m \x1b[39m\x1b[27m\x1b[30m_\x1b[39m',
    '    ',
  ].join('\n');
  const uncoloured = ['    c', '2.0 ____', '1.0 __ _', '    '].join('\n');

  it('emits ANSI codes when FORCE_COLOR is set', () => {
    expect(chart()).toBe(coloured);
  });

  it('emits none when FORCE_COLOR is 0', () => {
    process.env.FORCE_COLOR = '0';
    expect(chart()).toBe(uncoloured);
  });

  // other rules read argv and platform: render in a child process
  const inChild = (childEnv: Record<string, string>, flags: string[] = []): string =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [join(__dirname, 'render.cjs'), JSON.stringify([[[1, 1], [2, 2]], { width: 8, height: 4, caption: 'c' }]), ...flags],
        { env: { BABAR_TEST_PLATFORM: 'linux', ...childEnv }, encoding: 'utf8' },
      ),
    );
  const rules: [string, Record<string, string>, string[], boolean][] = [
    ['nothing says the terminal has colours', {}, [], false],
    ['TERM is dumb', { TERM: 'dumb' }, [], false],
    ['TERM is xterm', { TERM: 'xterm' }, [], true],
    ['TERM ends with -256color', { TERM: 'foo-256color' }, [], true],
    ['COLORTERM is set', { COLORTERM: '' }, [], true],
    ['TERM_PROGRAM is Apple_Terminal', { TERM_PROGRAM: 'Apple_Terminal' }, [], true],
    ['TERM_PROGRAM is unknown', { TERM_PROGRAM: 'other' }, [], false],
    ['the platform is win32', { BABAR_TEST_PLATFORM: 'win32' }, [], true],
    ['--color is given', { TERM: 'dumb' }, ['--color'], true],
    ['--color=256 is given', { TERM: 'dumb' }, ['--color=256'], true],
    ['--no-color is given', { TERM: 'xterm' }, ['--no-color'], false],
    ['--no-color and --color are both given: --no-color wins, as in 0.2.3', { TERM: 'xterm' }, ['--color', '--no-color'], false],
    ['--no-color and --color=256 are both given', { TERM: 'xterm' }, ['--no-color', '--color=256'], false],
    ['--color comes after the -- terminator', { TERM: 'dumb' }, ['--', '--color'], false],
    ['FORCE_COLOR is set and --no-color is given: the variable wins', { FORCE_COLOR: '1' }, ['--no-color'], true],
    ['FORCE_COLOR is empty', { FORCE_COLOR: '' }, [], true],
    ['CI is set', { CI: '1', TERM: 'xterm' }, [], false],
    ['CI is set and FORCE_COLOR too', { CI: '1', FORCE_COLOR: '1' }, [], true],
    ['CI is GitLab', { CI: '1', GITLAB_CI: '1' }, [], true],
    ['CI is codeship', { CI: '1', CI_NAME: 'codeship' }, [], true],
    ['TEAMCITY_VERSION is 9.1', { TEAMCITY_VERSION: '9.1.0 (build 1)' }, [], true],
    ['TEAMCITY_VERSION is 8.0', { TEAMCITY_VERSION: '8.0.1', TERM: 'xterm' }, [], false],
    ['NO_COLOR is set', { NO_COLOR: '1', TERM: 'xterm' }, [], false],
    ['NO_COLOR is set and FORCE_COLOR too', { NO_COLOR: '1', FORCE_COLOR: '1' }, [], true],
    ['NO_COLOR is set and --color is given', { NO_COLOR: '1' }, ['--color'], true],
  ];
  for (const [name, childEnv, flags, on] of rules) {
    it(`emits ${on ? 'ANSI codes' : 'none'} when ${name}`, () => {
      expect(inChild(childEnv, flags)).toBe(on ? coloured : uncoloured);
    });
  }
});

describe("style: 'braille'", () => {
  for (const { name, points, options } of braille) {
    it(`renders ${name}`, () => {
      expectFixture(name, babar(points, options));
    });
  }

  it('fits in the requested width and height', () => {
    for (const [shape, points] of Object.entries(shapes)) {
      for (let height = 1; height <= 12; height++) {
        for (let width = 1; width <= 40; width++) {
          for (const caption of [undefined, 'a caption longer than the chart is wide']) {
            const got = size(babar(points, { style: 'braille', width, height, caption }));
            expect(got.lines, JSON.stringify({ shape, width, height, caption, ...got })).toBeLessThanOrEqual(height);
            expect(got.columns, JSON.stringify({ shape, width, height, caption, ...got })).toBeLessThanOrEqual(width);
          }
        }
      }
    }
  });

  it('fits in a fractional width and height, with a caption', () => {
    for (const height of [1.5, 2.5, 3.5, 4.2]) {
      const got = size(babar(shapes.thirty, { style: 'braille', width: 20.7, height, caption: 'c' }));
      expect(got.lines, `height ${height}`).toBe(Math.floor(height));
      expect(got.columns, `height ${height}`).toBeLessThanOrEqual(20);
    }
  });
});

describe("require('babar'), the bundle built by `npm run build`", () => {
  // `npm test` builds first: main of package.json is lib/babar.js
  const built: typeof babar = createRequire(__filename)('..');

  it('is the function, and renders every chart of 0.2.3 like the source', () => {
    expect(typeof built).toBe('function');
    for (const { name, points, options } of legacy) {
      expectFixture(name, built(points, options), false);
    }
  });

  it('is also its own `babar` and `default` properties', () => {
    const exported = built as typeof babar & { babar: unknown; default: unknown };
    const { babar: named } = createRequire(__filename)('..');
    expect(named).toBe(built);
    expect(exported.default).toBe(built);
  });

  it('gives the function as the default and as the `babar` export of a native ES module', () => {
    const url = pathToFileURL(join(__dirname, '..', 'lib', 'babar.js')).href;
    const script = `import main, { babar } from ${JSON.stringify(url)}; console.log(typeof main + ' ' + String(babar === main));`;
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    expect(out.trim()).toBe('function true');
  });

  it('renders the braille charts like the source', () => {
    for (const { name, points, options } of braille) {
      expect(built(points, options), name).toBe(babar(points, options));
    }
  });
});
