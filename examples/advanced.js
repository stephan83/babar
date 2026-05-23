var babar = require('../lib/babar');

function section(title) {
  var w = 72;
  var inner = title.length + 2;
  var pad = Math.max(0, Math.floor((w - inner) / 2));
  var right = Math.max(0, w - inner - pad);
  var line = '─'.repeat(pad) + ' ' + title + ' ' + '─'.repeat(right);
  console.log('\n' + line);
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. just above the floor — bar cap sitting exactly at the grid bottom');
// All values cluster just above minY so the bars are 1–2 rows tall max.
// Tests that partial blocks render correctly at very low heights.
var barelyAbove = [];
for (var i = 0; i < 40; i++) {
  barelyAbove.push([i, 100 + Math.sin(i * 0.4) * 0.9]);
}
console.log(babar(barelyAbove, {
  caption: 'sin wave compressed near floor (minY=99, maxY=103)',
  color: 'magenta',
  grid: 'grey',
  width: 72,
  height: 12,
  minY: 99,
  maxY: 103,
  yFractions: 2,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('2. just below the ceiling — bar cap touching the top row');
// Values crowd the top, testing that ▇/█ at the topmost row don't overflow.
var nearCeiling = [];
for (var i = 0; i < 40; i++) {
  nearCeiling.push([i, 99 + Math.cos(i * 0.3) * 0.95]);
}
console.log(babar(nearCeiling, {
  caption: 'cos wave compressed near ceiling (minY=97, maxY=101)',
  color: 'cyan',
  grid: 'grey',
  width: 72,
  height: 12,
  minY: 97,
  maxY: 101,
  yFractions: 2,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('3. single point — minimum viable dataset');
console.log(babar([[0, 42]], {
  caption: 'single point',
  color: 'yellow',
  grid: 'grey',
  width: 30,
  height: 6,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('4. all identical Y — flat chart (diff = 0)');
console.log(babar([[0,7],[1,7],[2,7],[3,7],[4,7],[5,7]], {
  caption: 'all values = 7',
  color: 'green',
  grid: 'grey',
  width: 40,
  height: 8,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('5. single unique X with many Y values — diffX = 0');
console.log(babar([[5,1],[5,3],[5,7],[5,2],[5,9]], {
  caption: 'all points at x=5 (avg=4.4)',
  color: 'blue',
  grid: 'grey',
  width: 30,
  height: 8,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('6. negative Y range — bars below zero');
var negPts = [];
for (var i = 0; i < 30; i++) {
  negPts.push([i, Math.sin(i * 0.5) * 50]);
}
console.log(babar(negPts, {
  caption: 'sin wave from -50 to +50',
  color: 'red',
  grid: 'grey',
  width: 72,
  height: 14,
  yFractions: 1,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('7. very sparse data — 3 points over wide x range with many empty buckets');
console.log(babar([[0, 10], [50, 90], [100, 40]], {
  caption: '3 points → empty buckets interpolate from neighbours',
  color: 'yellow',
  grid: 'grey',
  width: 72,
  height: 10,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('8. dense data — many points per bucket (averaging)');
var densePts = [];
for (var i = 0; i < 2000; i++) {
  var x = Math.floor(i / 20);    // 100 unique x values
  var noise = (Math.random() - 0.5) * 30;
  densePts.push([x, Math.sin(x * 0.2) * 40 + 50 + noise]);
}
console.log(babar(densePts, {
  caption: '2000 points → 100 buckets averaged (sin + noise)',
  color: 'cyan',
  grid: 'grey',
  width: 72,
  height: 14,
  yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('9. tiny terminal — minimum size');
console.log(babar([[0,1],[1,3],[2,2]], {
  caption: 'tiny',
  color: 'green',
  grid: 'grey',
  width: 16,
  height: 5,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('10. exponential growth — tests label width with large numbers');
var expPts = [];
for (var i = 0; i < 20; i++) {
  expPts.push([i, Math.pow(2, i)]);
}
console.log(babar(expPts, {
  caption: '2^x from 1 to 524288',
  color: 'magenta',
  grid: 'grey',
  width: 72,
  height: 14,
  yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('11. clipped window — maxY cuts off spikes');
var spiky = [[0,5],[1,5],[2,5],[3,999],[4,5],[5,5],[6,999],[7,5],[8,5]];
console.log(babar(spiky, {
  caption: 'spikes at x=3 and x=6 clipped by maxY=10',
  color: 'red',
  grid: 'grey',
  width: 72,
  height: 10,
  maxY: 10,
  yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('12. sub-row precision showcase — staircase through all 8 block levels');
// Build a staircase so each bar cap falls exactly at k/8 fractions
var stairPts = [];
for (var i = 0; i < 9; i++) {
  stairPts.push([i, i / 8]);   // 0/8, 1/8, 2/8 … 8/8
}
console.log(babar(stairPts, {
  caption: 'staircase: each bar cap at k/8 — shows ▁▂▃▄▅▆▇█',
  color: 'cyan',
  grid: 'grey',
  width: 72,
  height: 10,
  yFractions: 3,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('13. ascii fallback — same staircase without color');
console.log(babar(stairPts, {
  caption: 'staircase in ascii mode',
  color: 'ascii',
  width: 72,
  height: 10,
  yFractions: 3,
}));
