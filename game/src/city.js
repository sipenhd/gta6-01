// The city of Solmar Bay: its road grid, buildings, parks, beach and harbor.
// Generation is seeded, so the same seed always builds the same city. Helpers here
// answer the questions the simulation asks every frame: is this point on a road,
// inside a building, on the beach, or in the water?
import { WORLD, ROAD, PALETTE } from './config.js';
import { pickRandom, rangeRandom } from './random.js';

export const ROAD_XS = [400, 800, 1200, 1600, 2000, 2400, 2800];
export const ROAD_YS = [400, 800, 1200, 1600, 2000];
export const BEACH_X = 260; // west of this: sand, then water
export const WATER_X = 130;

export function isOnRoad(x, y) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < ROAD.width / 2) return true;
  for (const ry of ROAD_YS) if (Math.abs(y - ry) < ROAD.width / 2) return true;
  return false;
}
export function nearestRoadX(x) {
  let best = ROAD_XS[0];
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < Math.abs(x - best)) best = rx;
  return best;
}
export function nearestRoadY(y) {
  let best = ROAD_YS[0];
  for (const ry of ROAD_YS) if (Math.abs(y - ry) < Math.abs(y - best)) best = ry;
  return best;
}
export function districtAt(x, y) {
  if (x < 800 && y < 800) return 'Old Harbor';
  if (x < 1600 && y < 800) return 'Palm Row';
  if (y < 800) return 'Neon Strip';
  if (x < 1200 && y >= 1600) return 'The Docks';
  if (x >= 2000 && y >= 1600) return 'The Hills';
  if (x >= 1200 && x < 2000 && y >= 800 && y < 1600) return 'Downtown';
  return 'Solmar Bay';
}

export function buildCity(random) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const palms = [];
  // One building (or a park) per city block, between the roads.
  const blockXs = [260, 440, 840, 1240, 1640, 2040, 2440, 2840];
  const blockYs = [40, 440, 840, 1240, 1640, 2040];
  for (const bx of blockXs) {
    for (const by of blockYs) {
      const bw = 320; const bh = 320;
      if (bx + bw > WORLD.width || by + bh > WORLD.height) continue;
      // Harbor pier area and the big central park stay open.
      if (bx < 500 && by > 1900) continue;
      if (bx === 1240 && by === 840) { parks.push({ x: bx, y: by, w: bw, h: bh }); continue; }
      if (bx === 2040 && by === 440) { parks.push({ x: bx, y: by, w: bw, h: bh }); continue; }
      if (random() < 0.12) { parks.push({ x: bx, y: by, w: bw, h: bh }); continue; }
      const n = 1 + Math.floor(random() * 2);
      for (let i = 0; i < n; i += 1) {
        const w = rangeRandom(random, 90, 150);
        const h = rangeRandom(random, 90, 150);
        const x = bx + 20 + random() * (bw - w - 40);
        const y = by + 20 + random() * (bh - h - 40);
        const tall = random() < 0.3;
        buildings.push({
          x, y, w, h, color: pickRandom(random, PALETTE.building),
          roof: pickRandom(random, PALETTE.roof), tall,
          neon: random() < 0.22 ? pickRandom(random, PALETTE.neon) : null,
          windows: Math.floor(random() * 4),
        });
      }
    }
  }
  for (const park of parks) {
    for (let i = 0; i < 9; i += 1) trees.push({ x: park.x + 30 + random() * (park.w - 60), y: park.y + 30 + random() * (park.h - 60), r: 12 + random() * 10 });
  }
  // Palm trees along the beach and Palm Row.
  for (let y = 60; y < WORLD.height; y += 130) palms.push({ x: 285 + random() * 30, y, r: 10 });
  for (let x = 900; x < 1500; x += 110) palms.push({ x, y: 340 + random() * 20, r: 9 });

  // Collectible seashells + cash stashes scattered on sidewalks and parks.
  const collectibles = [];
  for (let i = 0; i < 14; i += 1) {
    const x = 300 + random() * (WORLD.width - 500);
    const y = 100 + random() * (WORLD.height - 200);
    if (isOnRoad(x, y)) continue;
    collectibles.push({ x, y, kind: random() < 0.5 ? 'shell' : 'cash', taken: false });
  }
  // Health kits and ammo boxes near mission spots.
  const pickups = [
    { x: 1450, y: 1450, kind: 'health', taken: false },
    { x: 2150, y: 1050, kind: 'health', taken: false },
    { x: 2250, y: 1150, kind: 'ammo', taken: false },
    { x: 550, y: 2050, kind: 'health', taken: false },
    { x: 1000, y: 650, kind: 'ammo', taken: false },
    { x: 2600, y: 1850, kind: 'health', taken: false },
  ];
  return { buildings, parks, trees, palms, collectibles, pickups };
}

export function collideBuildings(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

export function pointInWater(x) { return x < WATER_X; }
export function pointOnBeach(x) { return x >= WATER_X && x < BEACH_X; }
