// Screenshot scenes behind ?shot=start|play|chase|mission. Each one stages a real
// game state from a fresh world — driving with a scripted autopilot, a police chase,
// or a mission in progress — then paints it twice and sets window.__shotReady.
import { STEP, MISSIONS } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

// A scripted stand-in for live input: drives toward a target point on the roads.
function makeDriver(targetX, targetY) {
  return {
    keys: new Set(), mouse: { x: 640, y: 360 },
    up() { return true; }, down() { return false; },
    left() { return this._steer < 0; }, right() { return this._steer > 0; },
    run() { return false; }, brake() { return false; },
    steer() { return this._steer || 0; }, throttle() { return 1; },
    takeActions() { return 0; }, takeClick() { return false; },
    _steer: 0,
  };
}
function steerToward(world, driver) {
  const p = world.state.player;
  const car = world.state.cars[p.carId];
  if (!car) return;
  const tx = driver._tx; const ty = driver._ty;
  const want = Math.atan2(ty - car.y, tx - car.x);
  let d = want - car.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  driver._steer = d > 0.12 ? 1 : d < -0.12 ? -1 : 0;
}
function stepWorld(world, input, steps) {
  for (let i = 0; i < steps; i += 1) {
    if (input._tx !== undefined) steerToward(world, input);
    world.step(STEP, input, null);
  }
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'start') {
    stepWorld(world, makeDriver(0, 0), Math.floor(4 / STEP));
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    // Get in the starter sedan and drive straight north up road 1600.
    const driver = makeDriver(0, 0); driver._tx = 1600; driver._ty = 500;
    state.player.x = 1600; state.player.y = 1440;
    world.step(STEP, { takeActions: () => 4, takeClick: () => false, up: () => false, down: () => false, left: () => false, right: () => false, run: () => false, brake: () => false, steer: () => 0, throttle: () => 0 }, null);
    stepWorld(world, driver, Math.floor(2.5 / STEP));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const driver = makeDriver(0, 0); driver._tx = 1600; driver._ty = 300;
    state.player.x = 1600; state.player.y = 1440;
    world.step(STEP, { takeActions: () => 4, takeClick: () => false, up: () => false, down: () => false, left: () => false, right: () => false, run: () => false, brake: () => false, steer: () => 0, throttle: () => 0 }, null);
    world.addWanted(3);
    stepWorld(world, driver, Math.floor(2.5 / STEP));
    state.wanted = 3;
    return { screen: SCREEN_PLAY };
  }
  // mission: Harbor Heist in progress, on foot at the pier with the crate marker.
  state.missionIndex = 2; state.stageIndex = 1;
  state.player.x = 620; state.player.y = 2080; state.player.angle = Math.PI;
  state.camera.x = 620; state.camera.y = 2080;
  state.money = 940;
  world.setMessage(MISSIONS[2].intro, 6);
  state.enemies.push(world.spawnEnemy(500, 2100), world.spawnEnemy(560, 2160));
  const idle = { takeActions: () => 0, takeClick: () => false, up: () => false, down: () => false, left: () => false, right: () => false, run: () => false, brake: () => false, steer: () => 0, throttle: () => 0 };
  stepWorld(world, idle, Math.floor(1.5 / STEP));
  state.player.x = 620; state.player.y = 2080; state.camera.x = 620; state.camera.y = 2080;
  return { screen: SCREEN_PLAY };
}
