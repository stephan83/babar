var babar = require('../lib/babar');

// Lines drawn with braille characters (style: 'braille')

var points = [];

for (var i = 0; i < Math.PI * 2; i += Math.PI / 1000) {
  points.push([i, Math.cos(i)]);
}

// more points than dots: each dot is the average of its points
console.log(babar(points, {
  style: 'braille',
  color: 'green',
  caption: 'y = cos(x)'
}));

// fewer points than dots: the points are joined
console.log(babar([[0, 1], [1, 5], [2, 5], [3, 1], [4, 6]], {
  style: 'braille',
  color: 'ascii',
  width: 40,
  height: 8
}));
