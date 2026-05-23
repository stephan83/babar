var babar = require('../lib/babar');

function section(title) {
  var w = 72;
  var inner = title.length + 2;
  var pad = Math.max(0, Math.floor((w - inner) / 2));
  var right = Math.max(0, w - inner - pad);
  console.log('\n' + '─'.repeat(pad) + ' ' + title + ' ' + '─'.repeat(right));
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. aggregation: avg (default) vs sum vs count');

var requestLog = [];
for (var i = 0; i < 10; i++) {
  for (var j = 0; j < Math.floor(Math.random() * 5 + 1); j++) {
    requestLog.push([i, Math.random() * 200 + 50]);  // response times
  }
}

console.log(babar(requestLog, {
  caption: 'avg response time per second',
  color: 'cyan', grid: 'grey', width: 72, height: 10,
  aggregation: 'avg', yFractions: 0,
}));
console.log(babar(requestLog, {
  caption: 'total response time (sum)',
  color: 'magenta', grid: 'grey', width: 72, height: 10,
  aggregation: 'sum', yFractions: 0,
}));
console.log(babar(requestLog, {
  caption: 'request count per second',
  color: 'green', grid: 'grey', width: 72, height: 8,
  aggregation: 'count', yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('2. aggregation: min / max — shows spread');

var noisyPts = [];
for (var i = 0; i < 12; i++) {
  for (var j = 0; j < 8; j++) {
    noisyPts.push([i, 50 + Math.sin(i * 0.5) * 30 + (Math.random() - 0.5) * 40]);
  }
}
console.log(babar(noisyPts, {
  caption: 'worst case (max) latency per bucket',
  color: 'red', grid: 'grey', width: 72, height: 10,
  aggregation: 'max', yFractions: 0,
}));
console.log(babar(noisyPts, {
  caption: 'best case (min) latency per bucket',
  color: 'green', grid: 'grey', width: 72, height: 10,
  aggregation: 'min', yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('3. yScale: log — exponential data readable at a glance');

var expPts = [];
for (var i = 1; i <= 20; i++) expPts.push([i, Math.pow(2, i)]);

console.log(babar(expPts, {
  caption: '2^x linear scale — everything looks flat except the last bar',
  color: 'yellow', grid: 'grey', width: 72, height: 12,
  yScale: 'linear', yFractions: 0,
}));
console.log(babar(expPts, {
  caption: '2^x log scale — growth is visible across all values',
  color: 'cyan', grid: 'grey', width: 72, height: 12,
  yScale: 'log', yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('4. refY — reference / threshold line');

var latency = [
  [0,45],[1,62],[2,38],[3,91],[4,110],[5,78],[6,55],[7,130],[8,48],[9,72],
];
console.log(babar(latency, {
  caption: 'p99 latency (ms) — SLA threshold at 80ms',
  color: 'cyan', grid: 'grey', width: 72, height: 12,
  refY: 80, yFractions: 0,
}));

// refY with log scale
console.log(babar(expPts, {
  caption: '2^x log scale with refY=1000',
  color: 'magenta', grid: 'grey', width: 72, height: 12,
  yScale: 'log', yFractions: 0, refY: 1000,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('5. categorical X — named buckets (vertical)');

var monthlyRevenue = [
  ['Jan', 12400], ['Feb', 9800],  ['Mar', 15600], ['Apr', 18200],
  ['May', 21000], ['Jun', 19500], ['Jul', 17800], ['Aug', 22400],
  ['Sep', 20100], ['Oct', 24600], ['Nov', 28900], ['Dec', 31200],
];
console.log(babar(monthlyRevenue, {
  caption: 'monthly revenue ($)',
  color: 'green', grid: 'grey', width: 72, height: 14,
  yFractions: 0,
}));

// categorical with aggregation on duplicate labels
var surveyResults = [
  ['Strongly agree', 34], ['Agree', 28], ['Neutral', 15],
  ['Disagree', 12], ['Strongly disagree', 8],
  // second survey round, same categories
  ['Strongly agree', 40], ['Agree', 31], ['Neutral', 11],
  ['Disagree', 9], ['Strongly disagree', 5],
];
console.log(babar(surveyResults, {
  caption: 'survey results (avg of 2 rounds)',
  color: 'blue', grid: 'grey', width: 72, height: 12,
  aggregation: 'avg', yFractions: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('6. categorical X — horizontal direction');

console.log(babar(monthlyRevenue, {
  caption: 'monthly revenue — horizontal',
  color: 'green', grid: 'grey', width: 72,
  direction: 'horizontal', yFractions: 0,
}));

console.log(babar(surveyResults, {
  caption: 'survey results — horizontal, avg aggregation',
  color: 'cyan', grid: 'grey', width: 72,
  direction: 'horizontal', aggregation: 'avg', yFractions: 1,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('7. numeric horizontal — time series turned sideways');

var cpuLoad = [];
for (var i = 0; i < 30; i++) {
  cpuLoad.push([i, 20 + Math.sin(i * 0.4) * 15 + Math.random() * 10]);
}
console.log(babar(cpuLoad, {
  caption: 'CPU load % over 30s (horizontal)',
  color: 'yellow', grid: 'grey', width: 72, height: 20,
  direction: 'horizontal', yFractions: 1, refY: 30,
}));

// ─────────────────────────────────────────────────────────────────────────────
section('8. combining features: log + refY + categorical + horizontal');

var diskUsage = [
  ['/', 45000], ['/home', 320000], ['/var', 8500],
  ['/tmp', 120], ['/boot', 980], ['/srv', 62000],
];
console.log(babar(diskUsage, {
  caption: 'disk usage (MB) — log scale, 10000 MB threshold',
  color: 'red', grid: 'grey', width: 72,
  direction: 'horizontal', yScale: 'log',
  refY: 10000, yFractions: 0,
}));
