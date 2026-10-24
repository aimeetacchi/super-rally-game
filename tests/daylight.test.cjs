const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real scene update loop without a browser or graphics context.
const phaser = {
  Scene: class {},
  Math: {
    Clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    Linear: (a, b, t) => a + (b - a) * t,
  },
};
const cache = new Map();
function loadSource(name) {
  if (cache.has(name)) return cache.get(name);
  const filename = path.resolve(__dirname, '../src', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      exports: module.exports,
      module,
      require: (name) => (name === 'phaser' ? { default: phaser } : loadSource(name.slice(2))),
    },
    { filename },
  );
  cache.set(name, module.exports);
  return module.exports;
}
const { sunsetProgress } = loadSource('daylight');
const { RallyScene } = loadSource('game');
function scene() {
  const game = new RallyScene(
    0,
    () => {},
    () => {},
  );
  game.draw = () => {};
  game.emit = () => {};
  game.curve = () => 0;
  game.keys = {};
  game.control('reset');
  return game;
}
function advance(game, seconds) {
  for (let i = 0; i < seconds * 10; i++) game.update(i * 100, 100);
}

test('daylight holds for 30 seconds, then fades smoothly over 20 seconds', () => {
  assert.equal(sunsetProgress(0), 0);
  assert.equal(sunsetProgress(30), 0);
  assert.equal(sunsetProgress(40), 0.5);
  assert.equal(sunsetProgress(50), 1);
  assert.equal(sunsetProgress(300), 1);
});
test('the starting garage and stationary racing do not advance daylight', () => {
  const game = scene();
  advance(game, 60);
  assert.equal(game.drivingSeconds, 0);
  game.control('start');
  advance(game, 60);
  assert.equal(game.drivingSeconds, 0);
});
test('moving advances the sunset and pausing freezes it', () => {
  const game = scene();
  game.keys = { UP: { isDown: true } };
  game.control('start');
  advance(game, 40);
  assert.ok(Math.abs(game.drivingSeconds - 40) < 0.001);
  assert.ok(Math.abs(sunsetProgress(game.drivingSeconds) - 0.5) < 0.001);
  game.control('pause');
  advance(game, 20);
  assert.ok(Math.abs(game.drivingSeconds - 40) < 0.001);
  game.control('start');
  advance(game, 10);
  assert.ok(Math.abs(sunsetProgress(game.drivingSeconds) - 1) < 0.001);
});
test('restarting restores daylight and resets the driving clock', () => {
  const game = scene();
  game.keys = { UP: { isDown: true } };
  game.control('start');
  advance(game, 50);
  game.control('reset');
  assert.equal(game.drivingSeconds, 0);
  assert.equal(game.elapsed, 0);
  assert.equal(sunsetProgress(game.drivingSeconds), 0);
});
