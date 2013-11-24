var babar = require('../lib/babar');

points = [];

for (var i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
  points.push([i, Math.cos(i)]);
}

console.log(babar(points, {color: 'ascii'}));
