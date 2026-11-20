// Solmar Bay — tuning, palette, districts and story data. One place for every number
// the rest of the game reads, so balancing never means hunting through logic.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const WORLD = { width: 3200, height: 2400 };
export const ROAD = { spacing: 400, width: 96 };
export const SAVE_KEY = 'solmar-bay.save.v1';

export const PLAYER = {
  walkSpeed: 230, runSpeed: 330, radius: 13, health: 100,
  punchDamage: 25, punchRange: 46, punchCooldown: 0.45,
  pistolDamage: 34, pistolRange: 430, pistolCooldown: 0.28, pistolAmmoStart: 48,
};
export const CAR = {
  accel: 430, brake: 720, reverseAccel: 230, maxSpeed: 570, maxReverse: 170,
  turnRate: 2.7, length: 52, width: 26, health: 100,
};
export const WANTED = { decayPerSecond: 0.1, hideDecay: 0.32, max: 5 };

export const PALETTE = {
  sky: '#2b1e4e', sunset: '#ff9a5a', sand: '#e8c98a', water: '#1f6f8b',
  waterDeep: '#155a75', grass: '#4d7a45', grassDark: '#3d6338',
  road: '#33343c', roadLine: '#e8d44d', sidewalk: '#8f8f98', sidewalkEdge: '#6e6e78',
  building: ['#7a5a8c', '#b0703f', '#4f7a8c', '#8c4f5a', '#5a6e4f', '#a08a4f', '#6a5a9c', '#3f6e6e'],
  roof: ['#5a4468', '#8a5530', '#3d5f6e', '#6e3d46', '#46583d', '#7d6a3a'],
  neon: ['#ff4fd8', '#3fe0ff', '#ffe14f', '#7dff5a', '#ff6a3d'],
  car: ['#d94f3d', '#3d7ad9', '#e8c33d', '#e8e8e8', '#3dd97a', '#9c4fd9', '#d97a3d', '#222831'],
  police: '#1c4fd9', taxi: '#f2c200', text: '#f5f0e6', muted: '#c9bfa8',
  hudBg: 'rgba(12,10,24,0.72)', hudLine: 'rgba(255,255,255,0.16)',
  health: '#3ddc5a', healthLow: '#ff4f3d', money: '#7dff5a', star: '#ffd94f',
  marker: '#ffe14f', enemy: '#ff4f6a', player: '#3fe0ff', minimapBg: 'rgba(10,12,26,0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const DISTRICTS = [
  { name: 'Old Harbor', x: 0, y: 0, w: 800, h: 800, tint: '#8c6a4f' },
  { name: 'Palm Row', x: 800, y: 0, w: 800, h: 800, tint: '#4f8c6a' },
  { name: 'Neon Strip', x: 1600, y: 0, w: 1600, h: 800, tint: '#c94fd9' },
  { name: 'The Docks', x: 0, y: 1600, w: 1200, h: 800, tint: '#4f6a8c' },
  { name: 'The Hills', x: 2000, y: 1600, w: 1200, h: 800, tint: '#8c8c4f' },
  { name: 'Downtown', x: 1200, y: 800, w: 800, h: 800, tint: '#d9a03d' },
];

// Story missions. Stages: goto, steal, escape, pickup, fare, defeat.
export const MISSIONS = [
  {
    id: 'first-job', title: '1 · First Job', reward: 300,
    intro: 'Rosa: "Marisol, my best driver quit. Take a car to Palm Row, pick up my cousin, drop him at the Docks. Easy money."',
    stages: [
      { type: 'goto', x: 1000, y: 600, label: 'Drive to the pickup in Palm Row', hint: 'Get in a car (E) and follow the yellow marker.' },
      { type: 'goto', x: 600, y: 1900, label: 'Drop your passenger at the Docks', hint: 'Stay on the roads — the cops watch the Strip.' },
    ],
  },
  {
    id: 'getaway', title: '2 · Getaway', reward: 400,
    intro: 'Rosa: "The harbor crew needs a car, fast. Take one — any one — and lose the patrols. Do not get caught."',
    stages: [
      { type: 'steal', label: 'Steal a car (press E near one)', hint: 'Taking a car in front of police raises your wanted level.' },
      { type: 'escape', label: 'Lose the cops — stay hidden until the stars fade', hint: 'Hide in alleys or outrun them. Wanted decays when unseen.' },
    ],
  },
  {
    id: 'harbor-heist', title: '3 · Harbor Heist', reward: 600,
    intro: 'Dario: "A crate washed up at Pier 4. Grab it, Marisol. The Greycoats will not just watch you take it."',
    stages: [
      { type: 'goto', x: 500, y: 2100, label: 'Reach Pier 4 at the Docks', hint: 'The package glows gold on the pier.' },
      { type: 'pickup', x: 500, y: 2100, label: 'Grab the crate (walk over it)', hint: 'Watch for Greycoat lookouts.' },
      { type: 'goto', x: 1500, y: 1500, label: 'Deliver the crate to the hideout', hint: 'Lose any heat on the way — or outrun it.' },
    ],
  },
  {
    id: 'taxi-rush', title: '4 · Taxi Rush', reward: 350,
    intro: 'Rosa: "Rent the yellow cab, love. Two fares, good tips, no questions. The meter is running."',
    stages: [
      { type: 'fare', x: 2100, y: 500, label: 'Pick up fare 1 on the Neon Strip', hint: 'Drive into the gold marker to collect the fare.' },
      { type: 'fare', x: 2600, y: 1900, label: 'Pick up fare 2 in the Hills', hint: 'One more fare and the shift is done.' },
    ],
  },
  {
    id: 'showdown', title: '5 · Showdown', reward: 800,
    intro: 'Dario: "The Greycoats took our garage. Take it back, Marisol. All of them. Then Solmar Bay is ours."',
    stages: [
      { type: 'goto', x: 2200, y: 1100, label: 'Reach the Greycoat garage on the Strip', hint: 'Bring ammo. Punch (F) or shoot (click) — your call.' },
      { type: 'defeat', count: 4, x: 2200, y: 1100, label: 'Clear out the Greycoats (0/4)', hint: 'Use cover. Health kits glow green.' },
    ],
  },
];

export const STORY_INTRO = [
  'Solmar Bay. Sun, salt air, and a city that never stops moving.',
  'Marisol Vega drove getaway cars once. Then she quit — until the rent came due.',
  'Now Rosa needs a driver, the Greycoats want the streets, and the bay',
  'is about to find out what Marisol can do behind a wheel.',
];

export const CONTROLS_TEXT = [
  'WASD / Arrows — walk or drive      E — enter / exit car',
  'Mouse — aim      Click — shoot pistol      F — punch',
  'Shift — run      Space — handbrake      M — mute      P / Esc — pause',
  'Steal cars, lose the cops, finish all five story jobs.',
];
