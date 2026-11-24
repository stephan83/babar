import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import babar from '../src/babar';
import { expectFixture, fixture } from './expect-fixture';

const env = { ...process.env };
beforeEach(() => {
  process.env.FORCE_COLOR = '1';
  delete process.env.NO_COLOR;
});
afterEach(() => {
  process.env = { ...env };
});

const five: babar.Point[] = [[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]];

describe('which options leave the rendering of 0.2.3', () => {
  // every Options key; `added`: leaves the 0.2.3 path. typecheck fails on a missing key.
  const options: { [K in keyof Required<babar.Options>]: { value: babar.Options[K]; added: boolean } } = {
    // the options of 0.2.3
    caption: { value: 'c', added: false },
    color: { value: 'green', added: false },
    grid: { value: 'grey', added: false },
    width: { value: 12, added: false },
    height: { value: 0, added: false },
    xFractions: { value: 1, added: false },
    yFractions: { value: 1, added: false },
    minX: { value: 0, added: false },
    maxX: { value: 4, added: false },
    minY: { value: 0, added: false },
    maxY: { value: 9, added: false },
    // the default value of an option added since changes nothing
    style: { value: 'bars', added: false },
    aggregation: { value: 'avg', added: false },
    yScale: { value: 'linear', added: false },
    direction: { value: 'vertical', added: false },
    // these only say how to read or colour what another option draws
    utc: { value: false, added: false },
    forceColor: { value: true, added: false },
    // the options added since
    refY: { value: 3, added: true },
    xType: { value: 'time', added: true },
    xFormat: { value: (value) => `${value}`, added: true },
    unit: { value: 'short', added: true },
    yFormat: { value: (value) => `${value}`, added: true },
    summary: { value: true, added: true },
  };
  // other values of the options whose default keeps the 0.2.3 path
  const values: babar.Options[] = [
    { style: 'braille' },
    { aggregation: 'sum' },
    { yScale: 'log' },
    { direction: 'horizontal' },
  ];

  // a height of 0 draws several rows in 0.2.3, and one line with any option added since
  const lines = (option: babar.Options): number =>
    babar(five, { width: 12, height: 0, ...option }).split('\n').length;

  for (const [name, { value, added }] of Object.entries(options)) {
    it(`${name} ${added ? 'leaves' : 'keeps'} the 0.2.3 rendering`, () => {
      if (added) expect(lines({ [name]: value })).toBe(1);
      else expect(lines({ [name]: value })).toBeGreaterThan(1);
    });
  }

  for (const option of values) {
    it(`${JSON.stringify(option)} leaves the 0.2.3 rendering`, () => {
      expect(lines(option)).toBe(1);
    });
  }

  it('labels and several series leave it too', () => {
    expect(babar([['a', 1], ['b', 2]], { width: 12, height: 0 }).split('\n').length).toBe(1);
    expect(babar([{ points: five }], { width: 12, height: 0 }).split('\n').length).toBe(1);
  });
});

describe('values that cannot be turned into text', () => {
  const noPrototype = Object.create(null);

  it('draws an empty caption for a Symbol or an object without prototype', () => {
    for (const caption of [Symbol('c'), noPrototype]) {
      expect(babar(five, { caption: caption as never, color: 'ascii', width: 12, height: 4 }).split('\n')[0]).toBe('  ');
      expect(babar(five, { caption: caption as never, style: 'braille', color: 'ascii', width: 12, height: 4 }).split('\n')[0]).toBe('  ');
      expect(babar(five, { caption: caption as never, direction: 'horizontal', color: 'ascii', width: 12, height: 4 }).split('\n')[0]).toBe('');
    }
  });

  it('draws a series without name for a name that is a Symbol or an object without prototype', () => {
    for (const name of [Symbol('n'), noPrototype]) {
      const chart = babar([{ name: name as never, points: five }], { color: 'ascii', width: 12, height: 5 });
      expect(chart.split('\n').pop()).toBe('  X');
    }
  });
});

describe('unit with values beyond the last unit', () => {
  const labels = (unit: babar.Unit, top: number): string[] =>
    babar([[0, 0], [1, top]], { unit, color: 'ascii', width: 30, height: 3 })
      .split('\n')
      .slice(0, 2)
      .map((line) => line.trim().split(' ')[0]);

  it('keeps the last unit while the number is short', () => {
    expect(labels('short', 5e14)).toEqual(['500T', '0']);
    expect(labels('bytes', 2 ** 50)).toEqual(['1024TiB', '0B']);
  });

  it('switches to a short exponent rather than printing hundreds of digits', () => {
    expect(labels('short', 1e300)).toEqual(['1.0e+288T', '0']);
    expect(labels('bytes', 1e300)).toEqual(['9.1e+287TiB', '0B']);
  });

  it('keeps the digits of a percentage under 1e15, then switches to a short exponent', () => {
    expect(labels('percent', 5e14)).toEqual(['500000000000000%', '0%']);
    expect(labels('percent', 1e15)).toEqual(['1.0e+15%', '0%']);
    expect(labels('percent', 1e300)).toEqual(['1.0e+300%', '0%']);
  });
});

describe('a categorical x axis with thousands of labels', () => {
  it('draws 100 000 points on 5 000 labels, one bucket per column', () => {
    const points: babar.CategoricalPoint[] = [];
    for (let i = 0; i < 100000; i++) points.push([`l${i % 5000}`, i % 5000 < 2500 ? 1 : 3]);
    expect(babar(points, { color: 'ascii', width: 24, height: 4 }).split('\n')).toEqual([
      '3                       ',
      '2            XXXXXXXXXXX',
      '1            XXXXXXXXXXX',
      '  l0      l1904   ',
    ]);
  });
});

describe('expectFixture', () => {
  it('never writes a legacy fixture, even when asked to', () => {
    const before = readFileSync(fixture('legacy-default'), 'utf8');
    process.env.UPDATE_FIXTURES = '1';
    expect(() => expectFixture('legacy-default', 'not what 0.2.3 rendered', true)).toThrow();
    expect(readFileSync(fixture('legacy-default'), 'utf8')).toBe(before);
  });

  it('fails on a fixture that does not exist, without writing it', () => {
    delete process.env.UPDATE_FIXTURES;
    expect(() => expectFixture('no-such-fixture', 'anything')).toThrow();
    expect(() => readFileSync(fixture('no-such-fixture'))).toThrow();
  });
});
