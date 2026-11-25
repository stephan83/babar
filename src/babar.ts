// Babar: cli bar charts.
// Port of 0.2.3: its options alone render what 0.2.3 did, byte for byte, quirks included.
// Newer options are opt-in and tidy up degenerate inputs.

// ANSI codes of the colors 1.4.0 styles
const styles: Record<string, number> = Object.create(null);
'black,red,green,yellow,blue,magenta,cyan,white'.split(',').forEach((name, i) => {
  const Name = name[0].toUpperCase() + name.slice(1);
  styles[name] = 30 + i;
  styles[`${name}BG`] = styles[`bg${Name}`] = 40 + i;
  if (i) {
    styles[`bright${Name}`] = 90 + i;
    styles[`bgBright${Name}`] = 100 + i;
  }
});
'reset,bold,dim,italic,underline,,,inverse,hidden,strikethrough'.split(',').forEach((name, i) => {
  if (name) styles[name] = i;
});
styles.gray = styles.grey = 90;
styles.bgGray = styles.bgGrey = 100;

const closing = (code: number): number =>
  code < 10 ? code && (code < 3 ? 22 : 20 + code) : code % 60 < 40 ? 39 : 49;

// colors 1.4.0 rules (no TTY check), plus NO_COLOR
const colorSupport = (): unknown => {
  const { env, argv, platform } = process;
  const flag = (...names: string[]) =>
    names.some((name) => {
      const pos = argv.indexOf(`--${name}`);
      const end = argv.indexOf('--');
      return pos > -1 && (end < 0 || pos < end);
    });
  let forced: boolean | undefined;
  if (flag('no-color', 'no-colors', 'color=false')) forced = false;
  else if (flag('color', 'colors', 'color=true', 'color=always')) forced = true;
  const force = env.FORCE_COLOR;
  if (force != null) forced = !force || parseInt(force, 10) !== 0;
  if (forced === false) return false;
  if (flag('color=256', 'color=16m', 'color=full', 'color=truecolor')) return true;
  if (env.NO_COLOR && !forced) return false;
  if (platform === 'win32') return true;
  if ('CI' in env) {
    return (
      forced ||
      env.CI_NAME === 'codeship' ||
      ['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some((name) => name in env)
    );
  }
  if ('TEAMCITY_VERSION' in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION!);
  }
  return (
    forced ||
    /^(iTerm\.app|Hyper|Apple_Terminal)$/.test(env.TERM_PROGRAM!) ||
    /-256(color)?$|^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM!) ||
    'COLORTERM' in env
  );
};

const repeat = (n: number, char: string): string => (n > 0 && n < Infinity ? char.repeat(n) : '');

// '' + value as 0.2.3 did; '' when that throws (Symbol, null prototype)
const asText = (value: unknown): string => {
  try {
    return '' + value;
  } catch {
    return '';
  }
};

const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value));

// toFixed without RangeError
const fixed = (value: number, digits: number): string => value.toFixed(clamp(0, 100, digits));

// 0.2.3 loops: count down when to < from, to excluded unless inclusive
const range = (from: number, to: number, inclusive = 0): number[] => {
  const out: number[] = [];
  if (from <= to) for (let i = from; inclusive ? i <= to : i < to; i++) out.push(i);
  else for (let i = from; inclusive ? i >= to : i > to; i--) out.push(i);
  return out;
};

const sum = (ys: number[]): number => ys.reduce((a, b) => a + b, 0);
const least = (ys: number[]): number => ys.reduce((a, b) => Math.min(a, b));
const most = (ys: number[]): number => ys.reduce((a, b) => Math.max(a, b));
const count = (ys: number[]): number => ys.length;

// null prototype: 'toString' is not an aggregation
const aggregators: Record<string, ((ys: number[]) => number) | undefined> = Object.assign(Object.create(null), {
  sum,
  min: least,
  max: most,
  last: (ys: number[]) => ys[ys.length - 1],
  count,
});

const MAX_SIZE = 1000;

const whole = (size: number, fallback: number): number =>
  Math.max(1, Math.floor(size === size ? size : fallback));

const unitFormat = (unit: unknown, plain: (v: number) => string): ((v: number) => string) => {
  // huge numbers as an exponent
  const short = (v: number, label: string, limit: number): string =>
    Math.abs(v) < limit ? label : v.toExponential(1);
  const scaled = (base: number, suffixes: string[]) => (v: number) => {
    let i = 0;
    let label;
    for (;;) {
      label = i ? v.toFixed(1).replace(/\.0$/, '') : plain(v);
      // 999999 is 1M, not 1000k
      if (!(Math.abs(+label) >= base && i < suffixes.length - 1)) break;
      v /= base;
      i++;
    }
    return short(v, label, 1e6) + suffixes[i];
  };
  return unit === 'short'
    ? scaled(1000, ['', 'k', 'M', 'G', 'T'])
    : unit === 'bytes'
      ? scaled(1024, ['B', 'KiB', 'MiB', 'GiB', 'TiB'])
      : unit === 'percent'
        ? (v) => `${short(v, plain(v), 1e15)}%`
        : plain;
};

// precision follows the x span
const timeFormat = (span: number, utc: unknown) => (v: number): string => {
  const d = new Date(v);
  const get = (part: string): number => (d as never as Record<string, () => number>)[`get${utc ? 'UTC' : ''}${part}`]();
  const two = (n: number): string => `${n}`.padStart(2, '0');
  const date = `${two(get('Date'))}/${two(get('Month') + 1)}`;
  const time = `${two(get('Hours'))}:${two(get('Minutes'))}`;
  const day = 864e5;
  return span < 2 * day
    ? time
    : span < 14 * day
      ? `${date} ${time}`
      : span < 365 * day
        ? date
        : `${get('FullYear')}-${two(get('Month') + 1)}`;
};

// colors 1.4.0 generated styles on one char: rainbow, america redden non-spaces; the rest are no-ops
const unchanged = ['zebra', 'strip', 'stripColors', 'random', 'trap', 'zalgo'];
const reddened = ['rainbow', 'america'];

// series defaults: colour, ascii fill
const palette = ['blue', 'cyan', 'magenta', 'yellow', 'green'];
const fills = ['X', 'O', '#', '+', '*'];

interface Line {
  name: string;
  points: [number, number][];
  color: string;
  fill: string;
  mark: string;
  values: number[];
}
interface Entry {
  mark: string;
  color: string;
  text: string;
  len: number;
}

// Legend lines within width. Drops in order: the summary if series > maxLines,
// max/avg/min cells while too wide, lines past maxLines.
const legendLines = (
  series: Line[],
  named: boolean,
  summary: unknown,
  fmt: (v: number) => string,
  width: number,
  indent: number,
  maxLines: number,
): Entry[][] => {
  if (!(named || summary) || !(maxLines > 0)) return [];
  const rows = series.map((one) => {
    const row = named ? [one.name] : [];
    if (summary) {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      for (const p of one.points) {
        min = Math.min(min, p[1]);
        max = Math.max(max, p[1]);
        sum += p[1];
      }
      const show = (v: number): string => (one.points.length ? fmt(v) : '-');
      row.push(`min ${show(min)}`, `avg ${show(sum / one.points.length)}`, `max ${show(max)}`);
    }
    return row;
  });
  let cols = series.length > maxLines ? +named : rows[0] ? rows[0].length : 0;
  let lines: Entry[][];
  for (;;) {
    lines = [];
    for (const [i, one] of series.entries()) {
      if (!cols) break;
      const mark = named ? one.mark : '';
      const text = rows[i]
        .slice(0, cols)
        .map((cell, j) =>
          cols > +named ? cell.padEnd(Math.max(...rows.map((row) => row[j].length))) : cell,
        )
        .join('  ')
        .replace(/\s+$/, '');
      const entry = { mark, color: one.color, text, len: text.length + 2 * mark.length };
      const last = lines[lines.length - 1];
      const used = last ? last.reduce((sum, e) => sum + e.len + 2, 0) : 0;
      if (last && cols === +named && used + entry.len <= width - indent) last.push(entry);
      else lines.push([entry]);
    }
    if (!(cols > +named && lines.some((line) => line[0].len > width))) break;
    cols--;
  }
  // no room for the text: mark alone
  for (const [e] of lines) {
    if (e.len > width) {
      e.text = e.text.slice(0, Math.max(0, width - 2 * e.mark.length));
      if (!e.text) e.mark = e.mark.slice(0, width);
      e.len = e.text ? e.text.length + 2 * e.mark.length : e.mark.length;
    }
  }
  return lines.slice(0, maxLines);
};

function babar(input: babar.AnyPoint[] | babar.Series[], given?: babar.Options | null): string {
  if (!Array.isArray(input)) throw new TypeError('babar: points must be an array of [x, y]');
  const options = given ?? {};
  const color = options.color ?? 'cyan';
  const grid = options.grid ?? 'black';
  const braille = options.style === 'braille';
  const horizontal = !braille && options.direction === 'horizontal';
  const aggregate = aggregators[options.aggregation!];
  const refY = options.refY!;
  let width = clamp(-MAX_SIZE, MAX_SIZE, options.width ?? 80);
  let height = clamp(-MAX_SIZE, MAX_SIZE, options.height ?? 15);
  let { caption, xFractions, yFractions } = options;

  // several series: [{name, points, color}]
  const several = input[0] != null && Array.isArray((input[0] as babar.Series).points);
  const series = (
    several
      ? (input as babar.Series[]).map((one, i) => ({
          name: asText(one?.name ?? `series ${i + 1}`),
          points: Array.isArray(one?.points) ? one.points : [],
          color: one?.color ?? palette[i % palette.length],
          fill: fills[i % fills.length],
        }))
      : [{ points: input, color, fill: 'X' }]
  ) as Line[];
  if (horizontal) series.length = 1;

  // categorical x: x is the rank of its label
  const names: string[] = [];
  const ranks = new Map<string, number>();
  if (series.some((one) => one.points.some((p) => typeof p[0] === 'string'))) {
    for (const one of series) {
      one.points = one.points.map((p) => {
        const name = `${p[0]}`;
        if (!ranks.has(name)) ranks.set(name, names.push(name) - 1);
        return [ranks.get(name)!, p[1]];
      });
    }
  } else if (options.xType === 'time') {
    // Date or epoch ms
    for (const one of series) one.points = one.points.map((p) => [+p[0], p[1]]);
  }

  // any newer option: tidy NaN cases, fit the size; else 0.2.3 output
  const modern = !!(
    braille ||
    horizontal ||
    several ||
    !!aggregate ||
    names.length > 0 ||
    options.yScale === 'log' ||
    options.summary ||
    options.unit != null ||
    options.xType != null ||
    options.xFormat != null ||
    options.yFormat != null ||
    Number.isFinite(refY)
  );
  if (modern) {
    width = whole(width, 80);
    height = whole(height, 15);
  }

  // no colours: modern vertical bars fall back to ascii (braille and horizontal unchanged)
  const colors = options.forceColor ?? colorSupport();
  const ascii = color === 'ascii' || (modern && !colors && !braille && !horizontal);
  const paint = (name: string, text: string): string =>
    colors && !ascii && name in styles
      ? `\x1b[${styles[name]}m${text}\x1b[${closing(styles[name])}m`
      : text;
  // braille without colours: lines look alike, no mark
  for (const one of series) {
    one.mark = ascii ? (braille ? '' : one.fill) : braille && !colors ? '' : '■';
  }

  const xs = new Set<number>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of series.flatMap((one) => one.points)) {
    xs.add(p[0]);
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  if (modern && !xs.size) {
    minX = minY = 0;
    maxX = maxY = 1;
  }
  minX = options.minX ?? minX;
  maxX = options.maxX ?? maxX;
  // single x: one bucket
  if (modern && maxX === minX) maxX++;
  const diffX = maxX - minX;

  // log needs every y > 0, else linear
  let lo = options.minY ?? minY;
  let hi = options.maxY ?? maxY;
  const log = options.yScale === 'log' && Math.min(minY, lo, hi) > 0;
  const toScale = log ? Math.log : (v: number): number => v;
  const fromScale = log ? Math.exp : (v: number): number => v;
  let minT = 0;
  let diffT = 0;
  let digits = 0;
  const scale = (size: number): void => {
    if (modern && hi === lo) {
      // flat series: mid height
      const pad = Math.abs(lo) / 2 || 1;
      lo -= pad;
      hi += pad;
      yFractions ??= +(pad < 10);
    }
    minT = toScale(lo);
    diffT = toScale(hi) - minT;
    digits = yFractions ?? clamp(0, 8, Math.log((size / (hi - lo)) * 5) / Math.LN10);
  };

  const yFormat =
    typeof options.yFormat === 'function'
      ? options.yFormat
      : unitFormat(options.unit, (v) => fixed(v, digits));
  const lblYOf = (v: number): string => `${yFormat(v)}`;
  const endsW = (): number => 1 + Math.max(lblYOf(lo).length, lblYOf(hi).length);

  let numBkts = 0;
  const bucketize = (): void => {
    for (const one of series) {
      const bkt: number[][] = [];
      for (const p of one.points) {
        (bkt[Math.min(numBkts - 1, Math.floor(((p[0] - minX) / diffX) * numBkts))] ??= []).push(p[1]);
      }
      one.values = [];
      let value = 0;
      for (const u of range(0, bkt.length)) {
        const ys = bkt[u];
        // empty bucket: previous value, 0 for sum and count
        if (ys) value = aggregate ? aggregate(ys) : (1 / ys.length) * sum(ys);
        else if (aggregate === sum || aggregate === count) value = 0;
        one.values.push(value);
      }
    }
    // aggregation: y axis follows the buckets
    const all = series.flatMap((one) => one.values);
    if (aggregate && all.length) {
      lo = options.minY ?? least(all);
      hi = options.maxY ?? most(all);
    }
  };

  const xFormat =
    typeof options.xFormat === 'function'
      ? options.xFormat
      : options.xType === 'time'
        ? timeFormat(diffX, options.utc ?? true)
        : (v: number): string => fixed(v, xFractions!);
  const lblX = (u: number): string => {
    const x = minX + (u * diffX) / (numBkts - 1 || +modern);
    return names.length ? (names[Math.round(x)] ?? '') : `${xFormat(x)}`;
  };
  const guessX = (): void => {
    xFractions ??= clamp(0, 8, Math.log((numBkts / diffX) * 5) / Math.LN10);
  };

  const out: string[] = [];

  if (horizontal) {
    // one row per bucket: label, eighth-block bar, value
    if (caption != null && height > 1) {
      out.push(paint('bold', asText(caption).slice(0, width)));
      height--;
    }
    numBkts = Math.max(1, Math.min(xs.size, height));
    bucketize();
    const { values } = series[0];
    scale(height);
    guessX();
    const labels = values.map((_, u) => lblX(u));
    const shown = values.map(lblYOf);
    const widest = (texts: string[]): number => Math.max(0, ...texts.map((text) => text.length)) + 1;
    // no room: drop values, then labels
    let labW = widest(labels);
    let valW = widest(shown);
    if (width - labW - valW < 1) valW = 0;
    if (width - labW - valW < 1) labW = 0;
    const room = width - labW - valW;
    const refCol = Math.round(((toScale(refY) - minT) / diffT) * room);
    values.forEach((v, u) => {
      const length = clamp(0, 1, (toScale(v) - minT) / diffT) * room;
      const full = Math.floor(length);
      const part = Math.round((length - full) * 8);
      let row = labW ? `${labels[u].padStart(labW - 1)} ` : '';
      row += ascii
        ? repeat(full + +(part > 3), 'X')
        : full || part
          ? paint(color, repeat(full, '█') + (part ? String.fromCharCode(0x2590 - part) : ''))
          : '';
      for (const c of range(full + +(ascii ? part > 3 : part > 0), room)) {
        row += c === refCol ? (ascii ? '|' : paint(grid, '╎')) : ascii ? '.' : paint(grid, '·');
      }
      out.push(valW ? `${row} ${shown[u]}` : row);
    });
    return out.join('\n');
  }

  // newer options drop the caption, then the x labels, to fit
  let titled = caption != null;
  let labelled = true;
  if (modern) {
    titled &&= height > 2;
    labelled = height > 1;
    height = Math.max(1, height - +titled - +labelled);
  } else {
    height -= 1 + +!!caption;
  }

  // Legend takes rows while 2 stay for the graph.
  // Loop until y labels stop growing: with aggregation, fewer buckets can widen them.
  // y label decimals stay those guessed without legend.
  const full = width;
  const rows = height;
  scale(rows);
  const legend = legendLines(
    series,
    several,
    options.summary,
    lblYOf,
    width,
    endsW(),
    height - 2,
  );
  height -= legend.length;

  // braille: series share characters
  const perBkt = braille ? 1 : series.length;
  let lblY: string[] = [];
  let lblYW = 0;
  let gutter = 0;
  let bktW = 0;
  for (;;) {
    scale(rows);
    lblY = range(height - 1, 0, 1)
      .map((v) => lblYOf(fromScale(minT + (diffT * v) / (height - 1 || +modern))))
      .reverse();
    let need = endsW();
    // modern: widest label, no gutter without room
    if (modern) need = Math.max(need, ...lblY.map((lbl) => 1 + lbl.length));
    if (need <= lblYW) break;
    lblYW = need;
    gutter = modern && width - lblYW < 1 ? 0 : lblYW;
    numBkts = modern
      ? Math.max(1, Math.min(xs.size, Math.floor((width - gutter) / perBkt)))
      : Math.min(xs.size, width - gutter);
    bktW = Math.floor((width - gutter) / numBkts);
    if (!braille) bucketize();
  }
  width -= gutter;
  guessX();
  const rowLabel = (r: number): string => {
    if (!gutter) return '';
    const lbl = r === 0 || lblY[r] !== lblY[r - 1] ? lblY[r] : '';
    return `${repeat(gutter - lbl.length - 1, ' ')}${lbl} `;
  };

  if (titled) {
    // 0.2.3 read .bold on the caption: not a string prints "undefined" (ascii prints the caption)
    const bold = (caption as never as { bold: unknown }).bold;
    out.push(
      repeat(gutter, ' ') +
        (modern
          ? paint('bold', asText(caption).slice(0, width))
          : ascii || typeof caption === 'string' || (caption as unknown) instanceof String
            ? paint('bold', asText(caption))
            : asText(bold)),
    );
  }

  if (braille) {
    // 2x4 dots per char
    const dotW = numBkts * bktW * 2;
    const cells = range(0, height).map(() => range(0, numBkts * bktW).map(() => 0));
    // shared char: colour of the last series
    const tints = cells.map((): string[] => []);
    for (const one of series) {
      const sums: number[] = [];
      const counts: number[] = [];
      for (const p of one.points) {
        const d = Math.round(((p[0] - minX) / diffX) * (numBkts - 1) * bktW * 2);
        if (d >= 0 && d < dotW) {
          sums[d] = (sums[d] ?? 0) + p[1];
          counts[d] = (counts[d] ?? 0) + 1;
        }
      }
      // dot height: average of its points, interpolated between
      const dots: number[] = [];
      let prev = -1;
      sums.forEach((sum, d) => {
        dots[d] = clamp(
          0,
          height * 4 - 1,
          Math.round(((toScale(sum / counts[d]) - minT) / diffT) * (height - 1) * 4 + 1.5),
        );
        if (prev >= 0) {
          for (const k of range(prev + 1, d)) {
            dots[k] = Math.round(dots[prev] + ((dots[d] - dots[prev]) * (k - prev)) / (d - prev));
          }
        }
        prev = d;
      });
      dots.forEach((y, d) => {
        // steep change: no gap
        const before = dots[d - 1];
        const start = Math.abs(before - y) > 1 ? before + (before < y ? 1 : -1) : y;
        for (const dot of range(start, y, 1)) {
          const fromTop = height * 4 - 1 - dot;
          const col = d & 1;
          const row = fromTop & 3;
          cells[fromTop >> 2][d >> 1] |= row < 3 ? 1 << (row + col * 3) : 64 << col;
          tints[fromTop >> 2][d >> 1] = one.color;
        }
      });
    }
    cells.forEach((row, r) =>
      out.push(
        rowLabel(height - 1 - r) +
          row
            .map((bits, c) => (bits ? paint(tints[r][c], String.fromCharCode(0x2800 + bits)) : ' '))
            .join(''),
      ),
    );
  } else {
    // one column per series per bucket; ascii single series: bars touch
    const shown = modern ? series.slice(0, bktW) : series;
    const colW =
      ascii && shown.length < 2 ? bktW : Math.max(1, Math.floor((bktW - 1) / shown.length));
    const sepW = bktW - colW * shown.length;
    const bars = shown.map((one) =>
      one.values.map((v) => ((toScale(v) - minT) / diffT) * (height - 1)),
    );
    const refRow = Math.round(((toScale(refY) - minT) / diffT) * (height - 1));
    // 0.2.3 path only: '_'[name], unknown names print "undefined" and commas. Modern: unstyled.
    const styled = (name: string, char: string): unknown =>
      modern || name in styles || unchanged.includes(name)
        ? paint(name, char)
        : reddened.includes(name)
          ? paint(char === ' ' ? '' : 'red', char)
          : (char as never)[name];
    const lineAt = (r: number): unknown =>
      ascii ? (r === refRow ? '-' : ' ') : styled(grid, r === refRow ? '╌' : '_');
    const join = (n: number, value: unknown): string =>
      repeat(n, value === undefined ? ',' : `${value}`);
    const cell = (r: number, v: number, one: Line): unknown => {
      if (r > v) return lineAt(r);
      if (r > v - 0.75) return ascii ? ' ' : styled(one.color, r < v - 0.25 ? '▄' : '_');
      // 0.2.3 threw when there was nothing to inverse
      if (ascii) return one.fill;
      // '__proto__' gives String.prototype
      const space = styled(one.color, ' ') ?? ' ';
      return typeof space === 'string' || space === String.prototype
        ? paint('inverse', `${space}`)
        : undefined;
    };
    // no rows: empty line, as 0.2.3
    const drawn: string[] = [];
    for (const r of range(height - 1, 0, 1)) {
      const line = lineAt(r);
      drawn.push(
        rowLabel(r) +
          range(0, Math.max(...bars.map((heights) => heights.length)))
            .map((u) => {
              const heights = bars.map((one) => (u < one.length ? one[u] : -Infinity));
              return (
                heights.map((v, i) => join(colW, cell(r, v, shown[i]))).join('') +
                (heights.every((v) => r > v) ? join(sepW, line) : repeat(sepW, `${line}`))
              );
            })
            .join(''),
      );
    }
    out.push(drawn.join('\n'));
  }

  if (labelled) {
    let lblXW = 0;
    for (const u of range(0, numBkts)) lblXW = Math.max(lblXW, lblX(u).length);
    let lblXN = modern && !xs.size ? 0 : numBkts;
    let lblXI = 1;
    // 0 and -1 never shrink: 0.2.3 looped forever
    while ((lblXN + 1) * lblXW >= numBkts * bktW && lblXN && lblXN !== -1) {
      lblXN = Math.floor(lblXN / 2);
      lblXI *= 2;
    }
    out.push(
      repeat(gutter, ' ') +
        range(0, lblXN)
          .map((x) => lblX(x * lblXI))
          .map((lbl) => lbl + repeat(bktW * lblXI - lbl.length, ' '))
          .join(''),
    );
  }

  for (const line of legend) {
    const len = line.reduce((sum, e) => sum + e.len + 2, -2);
    out.push(
      repeat(Math.min(gutter, full - len), ' ') +
        line
          .map(
            (e) =>
              (e.mark ? paint(e.color, e.mark) : '') +
              (e.mark && e.text ? ' ' : '') +
              (e.text ? paint('grey', e.text) : ''),
          )
          .join('  '),
    );
  }
  return out.join('\n');
}

declare namespace babar {
  /** A point is `[x, y]`. */
  export type Point = [number | Date, number];
  /** A point of a categorical x axis is `[label, y]`. */
  export type CategoricalPoint = [string, number];
  export type AnyPoint = Point | CategoricalPoint;

  /** One of several series. */
  export interface Series {
    /** Name in the legend: `series 1`, `series 2`, ... by default. */
    name?: string;
    points: AnyPoint[];
    /** Style of the line: blue, cyan, magenta, yellow, green in turn by default. */
    color?: Color;
  }

  export type Hue = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';
  export type Bright = Exclude<Hue, 'black'>;
  /** The static styles of colors 1.4.0. */
  export type Style =
    | Hue
    | 'gray'
    | 'grey'
    | `bright${Capitalize<Bright>}`
    | `bg${Capitalize<Hue>}`
    | 'bgGray'
    | 'bgGrey'
    | `bgBright${Capitalize<Bright>}`
    | `${Hue}BG`
    | 'reset'
    | 'bold'
    | 'dim'
    | 'italic'
    | 'underline'
    | 'inverse'
    | 'hidden'
    | 'strikethrough';
  /** A style, or `'ascii'` for a chart without ANSI codes. */
  export type Color = Style | 'ascii';

  export type Aggregation = 'avg' | 'sum' | 'min' | 'max' | 'last' | 'count';
  export type YScale = 'linear' | 'log';
  export type Direction = 'vertical' | 'horizontal';
  export type Unit = 'short' | 'bytes' | 'percent';

  export interface Options {
    /** Text displayed over the chart. */
    caption?: string;
    /** Style of the bars or of the line (`'cyan'` by default), or `'ascii'` for a chart without ANSI codes. */
    color?: Color;
    /** Style of the grid of a bar chart, `'black'` by default. */
    grid?: Style;
    /** Number of columns the output fits in, 80 by default. */
    width?: number;
    /** Number of lines the output fits in, 15 by default. */
    height?: number;
    /** Number of decimals of the x labels, guessed by default. */
    xFractions?: number;
    /** Number of decimals of the y labels, guessed by default. */
    yFractions?: number;
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    /** `'bars'` (default) draws bars, `'braille'` a line of braille characters. */
    style?: 'bars' | 'braille';
    /** What a bar shows of the points of its bucket, `'avg'` by default. */
    aggregation?: Aggregation;
    /** `'log'` for a logarithmic y axis, when every y is positive. */
    yScale?: YScale;
    /** Draws a reference line at this y value. */
    refY?: number;
    /** `'horizontal'` draws one row per bar. */
    direction?: Direction;
    /** `'time'`: the x values are epoch milliseconds or `Date` objects, labelled as times or dates. */
    xType?: 'time';
    /** With `xType: 'time'`, `false` prints the labels in the local time zone. Default `true`. */
    utc?: boolean;
    /** Formats the x labels itself (the value is a number). */
    xFormat?: (value: number) => string;
    /** Unit of the y labels: `'short'` (1.2k, 3.4M), `'bytes'` (1.5KiB) or `'percent'` (12%). */
    unit?: Unit;
    /** Formats the y labels itself. */
    yFormat?: (value: number) => string;
    /** Prints the min, avg and max of the points of each series under the chart. */
    summary?: boolean;
    /** `true` or `false` switches the ANSI colours on or off, whatever the environment says. */
    forceColor?: boolean;
  }

  // also .babar and .default: see the build:bundle footer
  export { babar, babar as default };
}

export = babar;
