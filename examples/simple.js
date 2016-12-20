var babar = require('../lib/babar');

console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]]));

console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]], {
  color: 'green',
  width: 40,
  height: 10,
  yFractions: 1
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
  height: 10,
  color: 'yellow',
  maxY: 100
}));
