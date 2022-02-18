var babar = require('../lib/babar');

points = [];

for (var i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
  points.push([i, Math.cos(i)]);
}
console.log(babar(points, {
  color: 'green',
  grid: 'grey',
  caption: 'y = cos(x)'}));

console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]], {
  color: 'blue',
  grid: 'grey',
  height: 10,
  yFractions: 1
}));
points = [];

for (var i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
  points.push([i, Math.sin(i)]);
}
console.log(babar(points, {color: 'ascii', caption: 'y = sin(x)'}));
