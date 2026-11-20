// Solmar Bay simulation: no drawing, no browser in here. The player on foot and in
// cars, traffic AI, pedestrians, police pursuit, the wanted level, combat, the five
// story missions, side collectibles, particles and skid marks. step() advances one
// fixed step and returns what happened as bit flags, so main.js can play sounds.
import { WORLD, ROAD, PLAYER, CAR, WANTED, MISSIONS, PALETTE, STEP } from './config.js';
import { buildCity, isOnRoad, nearestRoadX, nearestRoadY, collideBuildings, pointInWater, ROAD_XS, ROAD_YS } from './city.js';
import { pickRandom, rangeRandom } from './random.js';

export const EVENT_SHOT = 1;
export const EVENT_CRASH = 2;
export const EVENT_PICKUP = 4;
export const EVENT_CASH = 8;
export const EVENT_MISSION = 16;
export const EVENT_BUSTED = 32;
export const EVENT_WASTED = 64;
export const EVENT_HIT = 128;
export const EVENT_PUNCH = 256;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export function createWorld(random) {
  const city = buildCity(random);
  const state = {
    elapsed: 0, timeOfDay: 0.32, money: 120, wanted: 0, wantedSeen: 0,
    missionIndex: 0, stageIndex: 0, defeated: 0, packageCarried: false,
    message: '', messageTimer: 0, toast: '', toastTimer: 0, completed: false,
    busted: false, wasted: false, bustedTimer: 0, shake: 0, flash: 0,
    shells: 0, cashFound: 0,
    player: { x: 1560, y: 1480, angle: -Math.PI / 2, health: PLAYER.health, ammo: PLAYER.pistolAmmoStart, inCar: false, carId: -1, punchTimer: 0, shootTimer: 0, speed: 0 },
    camera: { x: 1560, y: 1480 },
    cars: [], peds: [], police: [], officers: [], enemies: [],
    particles: [], skids: [], tracers: [],
  };

  function makeCar(x, y, angle, color, kind) {
    return { x, y, angle, speed: 0, color, kind: kind || 'civilian', health: CAR.health, smoke: 0, parked: false, axis: 'h', lane: 0, dir: 1, cruise: 140 + random() * 90, stuck: 0 };
  }
  function spawnTrafficCar() {
    const horizontal = random() < 0.5;
    if (horizontal) {
      const y = pickRandom(random, ROAD_YS);
      return Object.assign(makeCar(300 + random() * 2600, y + (random() < 0.5 ? -12 : 12), random() < 0.5 ? 0 : Math.PI, pickRandom(random, PALETTE.car)), { axis: 'h', dir: random() < 0.5 ? 1 : -1, speed: 120 + random() * 80 });
    }
    const x = pickRandom(random, ROAD_XS);
    return Object.assign(makeCar(x + (random() < 0.5 ? -12 : 12), 300 + random() * 1800, random() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pickRandom(random, PALETTE.car)), { axis: 'v', dir: random() < 0.5 ? 1 : -1, speed: 120 + random() * 80 });
  }
  function spawnPed() {
    const x = 300 + random() * 2600; const y = 100 + random() * 2100;
    return { x, y, angle: random() * Math.PI * 2, speed: 40 + random() * 35, mode: 'walk', color: pickRandom(random, ['#e8a33d', '#3d9cd9', '#d93d7a', '#7ad93d', '#e8e8e8', '#9c6ad9']), down: false, fleeTimer: 0 };
  }
  function spawnEnemy(x, y) {
    return { x: x + rangeRandom(random, -60, 60), y: y + rangeRandom(random, -60, 60), angle: 0, health: 70, alive: true, shootTimer: 1 + random(), speed: 95 };
  }
  function addParticles(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2; const s = (speed || 120) * (0.4 + random() * 0.8);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + random() * 0.5, max: 0.9, color, size: 2 + random() * 4 });
    }
    if (state.particles.length > 300) state.particles.splice(0, state.particles.length - 300);
  }
  function scarePeds(x, y, radius) {
    for (const ped of state.peds) {
      if (!ped.down && dist(ped.x, ped.y, x, y) < radius) { ped.mode = 'flee'; ped.fleeTimer = 2.5; ped.angle = angleTo(x, y, ped.x, ped.y); }
    }
  }
  function addWanted(amount) {
    state.wanted = clamp(state.wanted + amount, 0, WANTED.max);
  }
  function nearestCar(x, y, maxDist) {
    let best = null; let bestD = maxDist;
    for (const car of state.cars) {
      const d = dist(x, y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
  function currentMission() { return MISSIONS[state.missionIndex] || null; }
  function currentStage() { const m = currentMission(); return m ? m.stages[state.stageIndex] : null; }

  function reset() {
    state.elapsed = 0; state.timeOfDay = 0.32; state.money = 120; state.wanted = 0; state.wantedSeen = 0;
    state.missionIndex = 0; state.stageIndex = 0; state.defeated = 0; state.packageCarried = false;
    state.message = ''; state.toast = ''; state.completed = false; state.busted = false; state.wasted = false;
    state.bustedTimer = 0; state.shake = 0; state.flash = 0; state.shells = 0; state.cashFound = 0;
    Object.assign(state.player, { x: 1560, y: 1480, angle: -Math.PI / 2, health: PLAYER.health, ammo: PLAYER.pistolAmmoStart, inCar: false, carId: -1, punchTimer: 0, shootTimer: 0, speed: 0 });
    state.camera.x = 1560; state.camera.y = 1480;
    state.cars = []; state.peds = []; state.police = []; state.officers = []; state.enemies = [];
    state.particles = []; state.skids = []; state.tracers = [];
    for (const c of city.collectibles) c.taken = false;
    for (const p of city.pickups) p.taken = false;
    // The player's starter sedan, parked by the hideout.
    const sedan = makeCar(1600, 1410, -Math.PI / 2, '#d94f3d', 'player'); sedan.parked = true; state.cars.push(sedan);
    const taxi = makeCar(1200, 860, 0, PALETTE.taxi, 'taxi'); taxi.parked = true; state.cars.push(taxi);
    for (let i = 0; i < 5; i += 1) {
      const c = makeCar(700 + i * 260, 400 + (i % 2) * 800, (i % 2) * Math.PI, pickRandom(random, PALETTE.car));
      c.parked = true; state.cars.push(c);
    }
    for (let i = 0; i < 13; i += 1) state.cars.push(spawnTrafficCar());
    for (let i = 0; i < 24; i += 1) state.peds.push(spawnPed());
    setMessage(MISSIONS[0].intro, 6);
  }
  function setMessage(text, seconds) { state.message = text; state.messageTimer = seconds || 5; }
  function setToast(text) { state.toast = text; state.toastTimer = 3; }

  function enterCar(events) {
    const p = state.player;
    const car = nearestCar(p.x, p.y, 75);
    if (!car) return events;
    p.inCar = true; p.carId = state.cars.indexOf(car);
    car.parked = false;
    const policeNear = state.police.some((c) => dist(c.x, c.y, p.x, p.y) < 400) || state.officers.some((o) => dist(o.x, o.y, p.x, p.y) < 250);
    if (car.kind !== 'player' && car.kind !== 'taxi') {
      if (policeNear) addWanted(1.5);
      else addWanted(0.6);
      setToast('You jacked a car! The city noticed.');
      if (currentStage() && currentStage().type === 'steal') advanceStage();
    } else setToast(car.kind === 'taxi' ? 'In the cab. Fares pay well.' : 'In your sedan.');
    return events;
  }
  function exitCar() {
    const p = state.player;
    const car = state.cars[p.carId];
    if (!car) { p.inCar = false; return; }
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.angle = car.angle; p.inCar = false; p.carId = -1; car.parked = true; car.speed = 0;
  }

  function advanceStage() {
    state.stageIndex += 1;
    const m = currentMission();
    if (m && state.stageIndex >= m.stages.length) completeMission();
  }
  function completeMission() {
    const m = currentMission();
    if (!m) return;
    state.money += m.reward;
    setMessage(`Job done: ${m.title} — +$${m.reward}`, 5);
    state.missionIndex += 1; state.stageIndex = 0; state.defeated = 0; state.packageCarried = false;
    if (state.missionIndex >= MISSIONS.length) { state.completed = true; setMessage('SOLMAR BAY IS YOURS. Marisol Vega runs this city now.', 8); }
    else setMessage(MISSIONS[state.missionIndex].intro, 6);
  }

  function shootAt(targetX, targetY) {
    const p = state.player;
    if (p.ammo <= 0 || p.shootTimer > 0) return 0;
    p.ammo -= 1; p.shootTimer = PLAYER.pistolCooldown; p.angle = angleTo(p.x, p.y, targetX, targetY);
    state.flash = 0.08;
    state.tracers.push({ x1: p.x, y1: p.y, x2: targetX, y2: targetY, life: 0.09 });
    addParticles(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24, '#ffe14f', 4, 90);
    // Nearest enemy / ped / car along the aim line.
    let best = null; let bestD = PLAYER.pistolRange;
    const consider = (x, y, d) => { if (d < bestD) { bestD = d; best = { x, y }; } };
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < PLAYER.pistolRange && Math.abs(angleDiff(p.angle, angleTo(p.x, p.y, e.x, e.y))) < 0.22) consider(e.x, e.y, d);
    }
    let hitEnemy = null;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < PLAYER.pistolRange && Math.abs(angleDiff(p.angle, angleTo(p.x, p.y, e.x, e.y))) < 0.22 && d === bestD) hitEnemy = e;
    }
    if (hitEnemy) {
      hitEnemy.health -= PLAYER.pistolDamage;
      addParticles(hitEnemy.x, hitEnemy.y, '#ff4f6a', 8, 140);
      if (hitEnemy.health <= 0) {
        hitEnemy.alive = false; state.defeated += 1; state.money += 25;
        addParticles(hitEnemy.x, hitEnemy.y, '#ff4f6a', 16, 180);
        if (currentStage() && currentStage().type === 'defeat') {
          if (state.defeated >= currentStage().count) advanceStage();
          else setToast(`Greycoats down: ${state.defeated}/${currentStage().count}`);
        }
      }
      return EVENT_SHOT;
    }
    for (const ped of state.peds) {
      if (ped.down) continue;
      const d = dist(p.x, p.y, ped.x, ped.y);
      if (d < PLAYER.pistolRange && Math.abs(angleDiff(p.angle, angleTo(p.x, p.y, ped.x, ped.y))) < 0.22 && d < bestD) {
        ped.down = true; addWanted(1); scarePeds(ped.x, ped.y, 260); setToast('You shot a civilian! The cops are coming.');
      }
    }
    scarePeds(p.x, p.y, 320);
    if (state.wanted > 0 || random() < 0.25) addWanted(0.3);
    return EVENT_SHOT;
  }
  function punch() {
    const p = state.player;
    if (p.punchTimer > 0) return 0;
    p.punchTimer = PLAYER.punchCooldown;
    let hit = false;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(p.x, p.y, e.x, e.y) < PLAYER.punchRange + 14) {
        e.health -= PLAYER.punchDamage; addParticles(e.x, e.y, '#ffe14f', 6, 120); hit = true;
        if (e.health <= 0) { e.alive = false; state.defeated += 1; state.money += 25; if (currentStage() && currentStage().type === 'defeat' && state.defeated >= currentStage().count) advanceStage(); }
      }
    }
    for (const ped of state.peds) {
      if (!ped.down && dist(p.x, p.y, ped.x, ped.y) < PLAYER.punchRange) { ped.down = true; addWanted(0.5); hit = true; }
    }
    return hit ? EVENT_PUNCH : 0;
  }

  function updatePlayerOnFoot(dt, input, events) {
    const p = state.player;
    let mx = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
    let my = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
    const len = Math.hypot(mx, my);
    const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (len > 0) { mx /= len; my /= len; p.angle = Math.atan2(my, mx); p.speed = speed; } else p.speed = 0;
    const nx = clamp(p.x + mx * speed * dt, 60, WORLD.width - 20);
    const ny = clamp(p.y + my * speed * dt, 60, WORLD.height - 20);
    if (pointInWater(nx)) { /* the bay stops you */ } else if (!collideBuildings(city, nx, p.y, PLAYER.radius)) p.x = nx;
    if (!collideBuildings(city, p.x, ny, PLAYER.radius)) p.y = ny;
    if (p.punchTimer > 0) p.punchTimer -= dt;
    if (p.shootTimer > 0) p.shootTimer -= dt;
    return events;
  }

  function updatePlayerCar(dt, input, events) {
    const p = state.player;
    const car = state.cars[p.carId];
    if (!car) { p.inCar = false; return events; }
    const steer = input.steer();
    const throttle = input.throttle();
    const forward = car.speed >= 0 ? 1 : -1;
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) car.speed -= (car.speed > 5 ? CAR.brake : CAR.reverseAccel) * dt;
    else car.speed -= Math.sign(car.speed) * 140 * dt;
    if (input.brake()) car.speed -= Math.sign(car.speed) * CAR.brake * dt * 0.8;
    if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
    car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
    const turn = steer * CAR.turnRate * clamp(Math.abs(car.speed) / 140, 0, 1) * forward;
    car.angle += turn * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const hit = collideBuildings(city, nx, ny, 22);
    if (hit || nx < 150 || nx > WORLD.width - 20 || ny < 60 || ny > WORLD.height - 20) {
      car.speed *= -0.25; car.health -= 6; state.shake = 0.35;
      addParticles(car.x, car.y, '#ff9a5a', 10, 160);
      events |= EVENT_CRASH;
      if (car.health <= 0) { car.smoke = 1; car.speed = 0; }
    } else { car.x = nx; car.y = ny; }
    if (Math.abs(car.speed) > 300 && steer !== 0) {
      state.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 2.5 });
      if (state.skids.length > 200) state.skids.shift();
    }
    // Running over pedestrians is a crime, and it scares everyone nearby.
    for (const ped of state.peds) {
      if (!ped.down && dist(car.x, car.y, ped.x, ped.y) < 30 && Math.abs(car.speed) > 60) {
        ped.down = true; addWanted(1); scarePeds(ped.x, ped.y, 300);
        state.shake = 0.3; setToast('You hit a pedestrian!');
      }
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = Math.abs(car.speed);
    if (car.health < 60) car.smoke = Math.min(1, car.smoke + dt * 0.2);
    if (car.smoke > 0.3 && random() < dt * 8) addParticles(car.x, car.y - 10, '#888888', 2, 40);
    return events;
  }

  function updateTraffic(dt) {
    const p = state.player;
    for (const car of state.cars) {
      if (car.kind === 'player' || car.kind === 'taxi' || car.kind === 'police') continue;
      if (state.cars.indexOf(car) === p.carId) continue;
      if (car.parked) continue;
      // Stop for the car ahead on the same lane.
      let blocked = false;
      for (const other of state.cars) {
        if (other === car || other.parked) continue;
        const d = dist(car.x, car.y, other.x, other.y);
        if (d < 64) {
          const ahead = car.axis === 'h' ? (car.dir > 0 ? other.x > car.x : other.x < car.x) : (car.dir > 0 ? other.y > car.y : other.y < car.y);
          if (ahead && Math.abs(car.axis === 'h' ? other.y - car.y : other.x - car.x) < 40) blocked = true;
        }
      }
      const nearPlayerCar = p.inCar && dist(car.x, car.y, p.x, p.y) < 70;
      if (blocked || nearPlayerCar) { car.speed = Math.max(0, car.speed - 300 * dt); }
      else car.speed = Math.min(car.cruise, car.speed + 120 * dt);
      // Turn at intersections sometimes; turn around at the city edge.
      const onX = ROAD_XS.some((rx) => Math.abs(car.x - rx) < 8);
      const onY = ROAD_YS.some((ry) => Math.abs(car.y - ry) < 8);
      if (car.axis === 'h' && onX && random() < dt * 0.5) { car.axis = 'v'; car.dir = random() < 0.5 ? 1 : -1; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else if (car.axis === 'v' && onY && random() < dt * 0.5) { car.axis = 'h'; car.dir = random() < 0.5 ? 1 : -1; car.angle = car.dir > 0 ? 0 : Math.PI; }
      if (car.axis === 'h') { car.x += car.dir * car.speed * dt; car.angle = car.dir > 0 ? 0 : Math.PI; if (car.x < 320 || car.x > WORLD.width - 40) car.dir *= -1; }
      else { car.y += car.dir * car.speed * dt; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; if (car.y < 120 || car.y > WORLD.height - 40) car.dir *= -1; }
      // Keep traffic on its road lane.
      if (car.axis === 'h') car.y = nearestRoadY(car.y) + (car.dir > 0 ? 12 : -12);
      else car.x = nearestRoadX(car.x) + (car.dir > 0 ? -12 : 12);
    }
  }

  function updatePeds(dt) {
    for (const ped of state.peds) {
      if (ped.down) continue;
      if (ped.mode === 'flee') {
        ped.fleeTimer -= dt;
        ped.x = clamp(ped.x + Math.cos(ped.angle) * 170 * dt, 140, WORLD.width - 20);
        ped.y = clamp(ped.y + Math.sin(ped.angle) * 170 * dt, 60, WORLD.height - 20);
        if (ped.fleeTimer <= 0) ped.mode = 'walk';
        continue;
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (random() < dt * 0.15) ped.angle += rangeRandom(random, -1.2, 1.2);
      if (ped.x < 150 || ped.x > WORLD.width - 30 || ped.y < 70 || ped.y > WORLD.height - 30 || collideBuildings(city, ped.x, ped.y, 8)) ped.angle += Math.PI * 0.75;
      if (!isOnRoad(ped.x, ped.y) && random() < dt * 0.4) ped.angle = angleTo(ped.x, ped.y, nearestRoadX(ped.x), nearestRoadY(ped.y));
    }
  }

  function spawnPolice() {
    const p = state.player;
    const want = Math.min(1 + Math.floor(state.wanted), 4);
    while (state.police.length < want) {
      const a = random() * Math.PI * 2;
      const x = clamp(p.x + Math.cos(a) * 650, 320, WORLD.width - 60);
      const y = clamp(p.y + Math.sin(a) * 650, 120, WORLD.height - 60);
      const car = makeCar(nearestRoadX(x), nearestRoadY(y), 0, PALETTE.police, 'police');
      car.speed = 200; state.police.push(car); state.cars.push(car);
    }
  }
  function updatePolice(dt, events) {
    const p = state.player;
    if (state.wanted >= 1) spawnPolice();
    else if (state.police.length > 0 && random() < dt * 0.2) {
      const gone = state.police.pop();
      const idx = state.cars.indexOf(gone); if (idx >= 0) state.cars.splice(idx, 1);
    }
    let seen = false;
    for (const car of state.police) {
      const d = dist(car.x, car.y, p.x, p.y);
      if (d < 700) seen = true;
      const target = angleTo(car.x, car.y, p.x, p.y);
      car.angle += clamp(angleDiff(car.angle, target), -2.4 * dt, 2.4 * dt);
      const wantSpeed = p.inCar ? 520 : 300;
      car.speed = Math.min(wantSpeed, car.speed + 260 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!collideBuildings(city, nx, ny, 22)) { car.x = clamp(nx, 150, WORLD.width - 20); car.y = clamp(ny, 60, WORLD.height - 20); }
      else { car.angle += Math.PI / 2 * dt * 4; car.speed *= 0.6; }
      if (d < 46) {
        if (p.inCar) {
          const pc = state.cars[p.carId];
          if (pc) { pc.health -= 12 * dt * 10; pc.speed *= 0.96; state.shake = 0.3; events |= EVENT_CRASH; }
        } else {
          state.bustedTimer += dt;
          if (state.bustedTimer > 1.6) { state.busted = true; events |= EVENT_BUSTED; }
        }
      }
    }
    if (!p.inCar && state.wanted >= 2) {
      while (state.officers.length < 2) state.officers.push({ x: p.x + rangeRandom(random, -400, 400), y: p.y + rangeRandom(random, -400, 400), angle: 0, speed: 150, punchTimer: 0 });
      for (const o of state.officers) {
        const d = dist(o.x, o.y, p.x, p.y);
        if (d < 700) seen = true;
        o.angle = angleTo(o.x, o.y, p.x, p.y);
        o.x += Math.cos(o.angle) * o.speed * dt; o.y += Math.sin(o.angle) * o.speed * dt;
        if (d < 30) { o.punchTimer -= dt; if (o.punchTimer <= 0) { o.punchTimer = 0.8; p.health -= 8; events |= EVENT_HIT; if (p.health <= 0) { state.wasted = true; events |= EVENT_WASTED; } } }
      }
    } else state.officers = [];
    // Wanted decays when no police can see you; faster when hidden.
    state.wantedSeen = seen ? state.wantedSeen + dt : 0;
    if (state.wanted > 0) {
      state.wanted -= (seen ? WANTED.decayPerSecond : WANTED.hideDecay) * dt * (p.inCar && p.speed > 350 ? 0.5 : 1);
      if (state.wanted < 0.05) { state.wanted = 0; state.bustedTimer = 0; if (currentStage() && currentStage().type === 'escape') advanceStage(); }
    }
    return events;
  }

  function updateEnemies(dt, events) {
    const p = state.player;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const d = dist(e.x, e.y, p.x, p.y);
      e.angle = angleTo(e.x, e.y, p.x, p.y);
      if (d > 90) { e.x += Math.cos(e.angle) * e.speed * dt; e.y += Math.sin(e.angle) * e.speed * dt; }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 380) {
        e.shootTimer = 1.4 + random();
        if (!p.inCar && random() < 0.6) { p.health -= 7; events |= EVENT_HIT; addParticles(p.x, p.y, '#ff4f6a', 4, 100); }
        state.tracers.push({ x1: e.x, y1: e.y, x2: p.x, y2: p.y, life: 0.09 });
        if (p.health <= 0) { state.wasted = true; events |= EVENT_WASTED; }
      }
    }
    return events;
  }

  function updateMission(dt, events) {
    const stage = currentStage();
    if (!stage) return events;
    const p = state.player;
    if (stage.type === 'goto' || stage.type === 'fare' || stage.type === 'pickup') {
      if (dist(p.x, p.y, stage.x, stage.y) < 75) {
        if (stage.type === 'pickup') {
          state.packageCarried = true; setToast('Crate grabbed! Get it to the hideout.');
          state.enemies.push(spawnEnemy(stage.x + 80, stage.y), spawnEnemy(stage.x - 80, stage.y));
          addWanted(1);
        } else if (stage.type === 'fare') { state.money += 60; events |= EVENT_CASH; setToast('Fare paid: +$60'); }
        advanceStage(); events |= EVENT_MISSION;
      }
    } else if (stage.type === 'defeat' && state.enemies.length === 0 && state.stageIndex === 1 && state.missionIndex === 4) {
      // Spawn the garage crew the first time the player arrives.
    }
    // Arriving at the showdown spawns the Greycoat crew.
    if (state.missionIndex === 4 && state.stageIndex === 1 && state.enemies.length === 0 && state.defeated === 0) {
      for (let i = 0; i < 4; i += 1) state.enemies.push(spawnEnemy(2200, 1100));
    }
    // Harbor heist lookouts appear at the pier.
    if (state.missionIndex === 2 && state.stageIndex === 1 && state.enemies.length === 0 && !state.packageCarried) {
      state.enemies.push(spawnEnemy(500, 2100), spawnEnemy(560, 2160));
    }
    return events;
  }

  function updatePickups(dt, events) {
    const p = state.player;
    for (const c of city.collectibles) {
      if (!c.taken && dist(p.x, p.y, c.x, c.y) < 34) {
        c.taken = true; events |= EVENT_CASH;
        if (c.kind === 'shell') { state.shells += 1; state.money += 15; setToast('Seashell found: +$15'); }
        else { state.cashFound += 1; state.money += 40; setToast('Stash found: +$40'); }
      }
    }
    for (const pk of city.pickups) {
      if (!pk.taken && dist(p.x, p.y, pk.x, pk.y) < 34) {
        pk.taken = true; events |= EVENT_PICKUP;
        if (pk.kind === 'health') { p.health = Math.min(PLAYER.health, p.health + 40); setToast('Health kit: +40'); }
        else { p.ammo += 24; setToast('Ammo box: +24 rounds'); }
      }
    }
    return events;
  }

  /** One fixed step. input is the live input object (or a scripted stand-in for shots). */
  function step(dt, input, mouseWorld) {
    let events = 0;
    state.elapsed += dt;
    state.timeOfDay = (state.timeOfDay + dt / 240) % 1;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.toastTimer > 0) state.toastTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash > 0) state.flash -= dt;
    for (const t of state.tracers) t.life -= dt;
    state.tracers = state.tracers.filter((t) => t.life > 0);
    for (const pt of state.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const s of state.skids) s.life -= dt;
    state.skids = state.skids.filter((s) => s.life > 0);

    const actions = input.takeActions ? input.takeActions() : 0;
    if (actions & 4) { // ACTION_ENTER
      if (state.player.inCar) exitCar();
      else events = enterCar(events);
    }
    if (actions & 8 && !state.player.inCar) events |= punch(); // ACTION_PUNCH
    const clicked = input.takeClick ? input.takeClick() : false;
    if (clicked && !state.player.inCar && mouseWorld) events |= shootAt(mouseWorld.x, mouseWorld.y);

    if (state.player.inCar) events = updatePlayerCar(dt, input, events);
    else events = updatePlayerOnFoot(dt, input, events);
    updateTraffic(dt);
    updatePeds(dt);
    events = updatePolice(dt, events);
    events = updateEnemies(dt, events);
    events = updateMission(dt, events);
    events = updatePickups(dt, events);

    if (state.player.health <= 0 && !state.wasted) { state.wasted = true; events |= EVENT_WASTED; }
    // Camera follows the player, smoothly.
    const focus = state.player;
    state.camera.x += (focus.x - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (focus.y - state.camera.y) * Math.min(1, dt * 5);
    return events;
  }

  function respawnAfterBusted() {
    state.busted = false; state.wasted = false; state.wanted = 0; state.bustedTimer = 0;
    state.money = Math.max(0, state.money - 100);
    state.player.health = PLAYER.health;
    state.player.x = 1500; state.player.y = 1500; state.player.inCar = false; state.player.carId = -1;
    state.police = []; state.officers = [];
    state.cars = state.cars.filter((c) => c.kind !== 'police');
    setMessage('You were busted. -$100 fine. Rosa bailed you out — get back to work.', 5);
  }

  function saveData() {
    return {
      money: state.money, missionIndex: state.missionIndex, stageIndex: state.stageIndex,
      health: state.player.health, ammo: state.player.ammo,
      x: state.player.x, y: state.player.y, shells: state.shells, cashFound: state.cashFound,
    };
  }
  function loadData(data) {
    if (!data) return;
    state.money = data.money ?? 120; state.missionIndex = data.missionIndex ?? 0; state.stageIndex = data.stageIndex ?? 0;
    state.player.health = data.health ?? PLAYER.health; state.player.ammo = data.ammo ?? PLAYER.pistolAmmoStart;
    state.player.x = data.x ?? 1560; state.player.y = data.y ?? 1480;
    state.shells = data.shells ?? 0; state.cashFound = data.cashFound ?? 0;
    state.camera.x = state.player.x; state.camera.y = state.player.y;
    if (currentMission()) setMessage(currentMission().intro, 6);
  }

  reset();
  return {
    state, city, reset, step, currentMission, currentStage, setMessage, setToast,
    respawnAfterBusted, saveData, loadData, addWanted, spawnEnemy,
  };
}
