var babar = require('../lib/babar');

// Bar charts of time series: time axis, readable units, legend and summary.
// The data is fixed:
// one value per hour over a day, with a morning peak and a smaller one in
// the evening.

var start = Date.UTC(2026, 10, 20);
var hour = 3600 * 1000;

function hourly(base, morning, evening) {
  var points = [];
  for (var h = 0; h < 24; h++) {
    points.push([start + h * hour, Math.round(
      base +
      morning * Math.exp(-Math.pow(h - 9, 2) / 8) +
      evening * Math.exp(-Math.pow(h - 18, 2) / 18)
    )]);
  }
  return points;
}

var charts = [
  // one series: time axis, short units, summary
  {
    name: 'timeseries-requests',
    points: hourly(800, 5200, 1500),
    options: {
      caption: 'requests per hour',
      xType: 'time',
      unit: 'short',
      summary: true,
      minY: 0,
      height: 14
    }
  },
  // two series: grouped bars, legend, summary
  {
    name: 'timeseries-services',
    points: [
      {name: 'checkout', points: hourly(800, 5200, 1500)},
      {name: 'search', points: hourly(300, 1900, 3100)}
    ],
    options: {
      caption: 'requests per hour, by service',
      xType: 'time',
      unit: 'short',
      summary: true,
      minY: 0,
      height: 16
    }
  }
];

module.exports = charts;

if (require.main === module) {
  charts.forEach(function (chart) {
    console.log(babar(chart.points, chart.options));
    console.log();
  });
}
