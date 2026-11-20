// Boot and the one loop: input every frame, the world in fixed 1/60 s steps, the
// renderer paints what is there. Screens: title, play, paused, wasted, busted, done.
// ?seed=N fixes the city. ?shot=start|play|chase|mission stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_SHOT, EVENT_CRASH, EVENT_PICKUP, EVENT_CASH, EVENT_MISSION, EVENT_BUSTED, EVENT_WASTED, EVENT_HIT, EVENT_PUNCH } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_DONE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try { return JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function writeSave() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.saveData())); } catch { /* private mode: play on without saving */ }
}
function mouseWorldPos(input) {
  const v = renderer.view;
  const lx = (input.mouse.screenX * (window.devicePixelRatio || 1) - v.x) / v.scale;
  const ly = (input.mouse.screenY * (window.devicePixelRatio || 1) - v.y) / v.scale;
  const camX = Math.max(640, Math.min(3200 - 640, world.state.camera.x));
  const camY = Math.max(360, Math.min(2400 - 360, world.state.camera.y));
  return { x: camX - VIEW.width / 2 + lx, y: camY - VIEW.height / 2 + ly };
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.city, scene.screen, false, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  const hasSave = readSave() !== null;

  function announce(message) { status.textContent = message; }
  function playEvents(events) {
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_CRASH) audio.crash();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_CASH) audio.cash();
    if (events & EVENT_MISSION) audio.mission();
    if (events & EVENT_BUSTED) audio.busted();
    if (events & EVENT_WASTED) audio.busted();
    if (events & EVENT_PUNCH) audio.punch();
  }
  function startNew() {
    world.reset(); accumulator = 0; screen = SCREEN_PLAY; writeSave();
    announce('Playing Solmar Bay. Follow the yellow marker.');
  }
  function continueGame() {
    const save = readSave();
    world.reset();
    if (save) world.loadData(save);
    accumulator = 0; screen = SCREEN_PLAY;
    announce('Continuing your story.');
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { const m = audio.toggleMute(); announce(m ? 'Muted.' : 'Sound on.'); }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startNew();
      else if (input.keys.has('KeyC') && hasSave) continueGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; writeSave(); announce('Paused. Progress saved.'); }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) screen = SCREEN_PLAY;
      else if (input.keys.has('KeyQ')) { writeSave(); screen = SCREEN_TITLE; }
    } else if (screen === SCREEN_OVER || screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) { world.respawnAfterBusted(); screen = SCREEN_PLAY; }
    } else if (screen === SCREEN_DONE) {
      if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
    }
    // Clicking the title starts too (pointerdown is not a confirm action; use mouse click flag).
    if (screen === SCREEN_TITLE && input.takeClick()) { audio.unlock(); startNew(); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const events = world.step(STEP, input, mouseWorldPos(input));
        playEvents(events);
        if (world.state.wasted) { screen = SCREEN_OVER; writeSave(); announce('Wasted.'); break; }
        if (world.state.busted) { screen = SCREEN_BUSTED; writeSave(); announce('Busted.'); break; }
        if (world.state.completed && screen === SCREEN_PLAY) { /* keep roaming; banner shows */ }
        accumulator -= STEP;
      }
      saveTimer += 1;
      if (saveTimer > 600) { saveTimer = 0; writeSave(); }
      const p = world.state.player;
      audio.setEngine(p.inCar ? Math.min(1, Math.abs(p.speed) / 570) : 0, p.inCar);
      audio.setSiren(world.state.wanted >= 1, world.state.elapsed);
      audio.updateMusic(STEP, true);
    } else if (screen === SCREEN_TITLE) {
      // Living backdrop: traffic drifts behind the title.
      while (accumulator >= STEP) { world.step(STEP, { takeActions: () => 0, takeClick: () => false, up: () => false, down: () => false, left: () => false, right: () => false, run: () => false, brake: () => false, steer: () => 0, throttle: () => 0 }, null); accumulator -= STEP; }
      audio.setEngine(0, false); audio.setSiren(false, 0);
    } else {
      accumulator = 0;
      audio.setEngine(0, false); audio.setSiren(world.state.wanted >= 1, world.state.elapsed);
    }
    renderer.draw(world.state, world.city, screen, audio.isMuted(), screen === SCREEN_PLAY ? mouseWorldPos(input) : null);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; writeSave(); announce('Paused.'); }
  });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
  announce('Solmar Bay. Press Enter to start, C to continue a saved game.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
