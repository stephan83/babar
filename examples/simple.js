var babar = require('../lib/babar');

console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]]));

console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]], {
  color: 'green',
  grid: 'grey',
  width: 40,
  height: 10,
  yFractions: 1
}));
console.log(babar([[0, 98], [1, 101], [2, 102], [3, 105], [4, 107], [5, 200], [6,0]], {
  color: 'green',
  grid: 'grey',
  height: 22
}));
console.log(babar([
    [0,0],
    [1, 98],
    [2, 100], [3, 101], [4, 102], [5, 103], [6, 105],
    [7, 106], [8, 107], [9, 108],
    [10, 200]
], {
    color: 'green',
    grid: 'grey',
    height: 10,
    minY: 80,
    maxY: 120
}));

console.log(babar([
	[0, 9],
	[1, 20],
	[2, 33],
	[3, 20],
	[4, 12],
	[5, 10],
	[6, 63],
	[7, 21]
], {
  width: 80,
  grid: 'blue',
  height: 10,
  color: 'yellow',
  maxY: 100
}));
