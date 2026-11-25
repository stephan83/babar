'use strict';
// Renders one chart with the bundle, as JSON. Colour tests run it in a child process.
// usage: node render.cjs '<json of [points, options]>' [flags...]
if (process.env.BABAR_TEST_PLATFORM) {
  Object.defineProperty(process, 'platform', { value: process.env.BABAR_TEST_PLATFORM });
}
const babar = require(process.env.BABAR_TEST_LIB || '..');
const [points, options] = JSON.parse(process.argv[2]);
process.stdout.write(JSON.stringify(babar(points, options)));
