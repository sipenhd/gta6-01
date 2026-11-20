// Drawing only: the world's state and the current screen in, pixels out. A smooth
// camera follows the player over the sunset city; the HUD, minimap, mission tracker,
// menus and overlays are painted on top. 1280x720 logical view, scaled to the window.
import { VIEW, PALETTE, FONT, MISSIONS, STORY_INTRO, CONTROLS_TEXT, DISTRICTS, CAR } from './config.js';
import { districtAt, pointOnBeach, pointInWater, ROAD_XS, ROAD_YS, BEACH_X } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_DONE = 'done';

const ROAD_W = 96;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  function font(size, bold) { const k = size + (bold ? 'b' : ''); if (!fonts.has(k)) fonts.set(k, `${bold ? '700 ' : ''}${size}px ${FONT}`); return fonts.get(k); }
  function text(value, x, y, size, color, align, bold) {
    ctx.font = font(size, bold); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,8,22,0.86)'; roundRect(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = PALETTE.hudLine; ctx.lineWidth = 1; ctx.stroke();
  }
  /** Sunset tint: 0 = noon, 1 = deep dusk, from the world's time of day. */
  function duskTint(timeOfDay) {
    const d = Math.sin(timeOfDay * Math.PI * 2);
    return Math.max(0, Math.min(1, 0.55 - d * 0.55));
  }

  function drawCity(state, city, camX, camY) {
    const dusk = duskTint(state.timeOfDay);
    // Sky-gradient ground: grass base, then sand and water on the west edge.
    const grad = ctx.createLinearGradient(0, camY - 360, 0, camY + 360);
    grad.addColorStop(0, '#7a5a3d'); grad.addColorStop(0.5, '#5d7a45'); grad.addColorStop(1, '#4d6338');
    ctx.fillStyle = grad; ctx.fillRect(camX - 640, camY - 360, 1280, 720);
    ctx.fillStyle = PALETTE.waterDeep; ctx.fillRect(camX - 640, camY - 360, 130 - (camX - 640), 720);
    ctx.fillStyle = PALETTE.water; ctx.fillRect(camX - 640, camY - 360, 150 - (camX - 640), 720);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(Math.max(camX - 640, 130), camY - 360, Math.min(260, camX + 640) - Math.max(camX - 640, 130), 720);
    // District tint labels under the roads.
    for (const d of DISTRICTS) {
      if (d.x + d.w < camX - 640 || d.x > camX + 640 || d.y + d.h < camY - 360 || d.y > camY + 360) continue;
      ctx.fillStyle = d.tint; ctx.globalAlpha = 0.16; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.globalAlpha = 1;
    }
    // Parks.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.grass; ctx.fillRect(park.x, park.y, park.w, park.h);
      ctx.fillStyle = PALETTE.grassDark; ctx.fillRect(park.x + 8, park.y + 8, park.w - 16, park.h - 16);
    }
    // Roads: asphalt, sidewalks, dashed centre lines.
    for (const rx of ROAD_XS) {
      ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(rx - ROAD_W / 2 - 14, camY - 360, ROAD_W + 28, 720);
      ctx.fillStyle = PALETTE.road; ctx.fillRect(rx - ROAD_W / 2, camY - 360, ROAD_W, 720);
      ctx.fillStyle = PALETTE.roadLine;
      for (let y = Math.floor((camY - 360) / 60) * 60; y < camY + 360; y += 60) ctx.fillRect(rx - 2, y, 4, 30);
    }
    for (const ry of ROAD_YS) {
      ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(camX - 640, ry - ROAD_W / 2 - 14, 1280, ROAD_W + 28);
      ctx.fillStyle = PALETTE.road; ctx.fillRect(camX - 640, ry - ROAD_W / 2, 1280, ROAD_W);
      ctx.fillStyle = PALETTE.roadLine;
      for (let x = Math.floor((camX - 640) / 60) * 60; x < camX + 640; x += 60) ctx.fillRect(x, ry - 2, 30, 4);
    }
    // Harbor piers on the south-west docks.
    ctx.fillStyle = '#6e5232';
    ctx.fillRect(300, 2050, 260, 26); ctx.fillRect(300, 2150, 260, 26);
    ctx.fillStyle = '#8a6a42'; ctx.fillRect(300, 2050, 260, 6);
    // Buildings with roofs, windows and the occasional neon sign.
    for (const b of city.buildings) {
      if (b.x + b.w < camX - 640 || b.x > camX + 640 || b.y + b.h < camY - 360 || b.y > camY + 360) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof; ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      const cols = Math.max(2, Math.floor(b.w / 34)); const rows = Math.max(2, Math.floor(b.h / 34));
      for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) {
        if ((i * 3 + j * 2 + b.windows) % 4 === 0) ctx.fillRect(b.x + 12 + i * 30, b.y + 12 + j * 30, 12, 14);
      }
      if (b.tall) { ctx.fillStyle = b.color; ctx.fillRect(b.x + b.w * 0.25, b.y - 26, b.w * 0.5, 26); ctx.fillStyle = b.roof; ctx.fillRect(b.x + b.w * 0.25, b.y - 26, b.w * 0.5, 6); }
      if (b.neon) { ctx.fillStyle = b.neon; ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h - 10, 44, 6); }
    }
    // Trees and palms.
    for (const t of city.trees) {
      if (t.x < camX - 640 || t.x > camX + 640 || t.y < camY - 360 || t.y > camY + 360) continue;
      ctx.fillStyle = '#2d4a26'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5da34f'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of city.palms) {
      if (p.x < camX - 640 || p.x > camX + 640 || p.y < camY - 360 || p.y > camY + 360) continue;
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 16); ctx.stroke();
      ctx.fillStyle = '#4fae4f'; ctx.beginPath(); ctx.arc(p.x + 4, p.y - 18, p.r, 0, Math.PI * 2); ctx.fill();
    }
    // Dusk wash over everything.
    if (dusk > 0.03) { ctx.fillStyle = `rgba(43,30,78,${dusk * 0.22})`; ctx.fillRect(camX - 640, camY - 360, 1280, 720); }
  }

  function drawSkids(state) {
    ctx.strokeStyle = 'rgba(20,20,20,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const s of state.skids) {
      ctx.globalAlpha = Math.min(1, s.life / 2.5);
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
      ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawCar(car, isPlayer) {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width, 8); ctx.fill();
    ctx.fillStyle = car.color; roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 8); ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.85)'; roundRect(-6, -CAR.width / 2 + 4, 16, CAR.width - 8, 4); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,30,0.8)'; roundRect(CAR.length / 2 - 12, -CAR.width / 2 + 5, 7, CAR.width - 10, 3); ctx.fill();
    ctx.fillStyle = '#ffe14f';
    ctx.fillRect(CAR.length / 2 - 2, -CAR.width / 2 + 3, 3, 5); ctx.fillRect(CAR.length / 2 - 2, CAR.width / 2 - 8, 3, 5);
    if (car.kind === 'police') {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-14, -CAR.width / 2 + 2, 28, 5);
      ctx.fillStyle = '#ff2d2d'; ctx.fillRect(-8, -CAR.width / 2 - 4, 7, 6);
      ctx.fillStyle = '#2d7dff'; ctx.fillRect(1, -CAR.width / 2 - 4, 7, 6);
    }
    if (isPlayer) { ctx.strokeStyle = '#3fe0ff'; ctx.lineWidth = 2.5; roundRect(-CAR.length / 2 - 3, -CAR.width / 2 - 3, CAR.length + 6, CAR.width + 6, 10); ctx.stroke(); }
    if (car.smoke > 0.3) { ctx.fillStyle = 'rgba(120,120,120,0.7)'; ctx.beginPath(); ctx.arc(-CAR.length / 2, 0, 8 + car.smoke * 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // Labels stay upright regardless of the car's heading.
    if (car.kind === 'police') text('POLICE', car.x, car.y + 4, 8, '#ffffff', 'center', true);
    if (car.kind === 'taxi') text('TAXI', car.x, car.y + 4, 9, '#111111', 'center', true);
  }

  function drawPerson(x, y, angle, color, down, isPlayer, isEnemy) {
    if (down) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, 12, 7, angle, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c98a'; ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isEnemy ? '#ff4f6a' : '#3fe0ff';
    if (isPlayer) { ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.strokeStyle = '#3fe0ff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    if (isEnemy) { ctx.fillStyle = '#ff4f6a'; ctx.fillRect(x - 12, y - 24, 24, 4); ctx.fillStyle = '#3ddc5a'; }
  }

  function drawWorld(state, city, camX, camY, mouseWorld) {
    drawCity(state, city, camX, camY);
    drawSkids(state);
    // Collectibles and pickups.
    for (const c of city.collectibles) {
      if (c.taken) continue;
      ctx.fillStyle = c.kind === 'shell' ? '#ff9ad8' : '#7dff5a';
      ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; text(c.kind === 'shell' ? '◉' : '$', c.x, c.y + 4, 11, '#111', 'center', true);
    }
    for (const pk of city.pickups) {
      if (pk.taken) continue;
      ctx.fillStyle = pk.kind === 'health' ? '#3ddc5a' : '#ffe14f';
      ctx.fillRect(pk.x - 10, pk.y - 10, 20, 20);
      text(pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 5, 13, '#111', 'center', true);
    }
    // Mission marker: pulsing gold pillar + ground ring.
    const stage = currentStageOf(state);
    if (stage && stage.x !== undefined) {
      const pulse = 1 + Math.sin(state.elapsed * 4) * 0.12;
      ctx.fillStyle = 'rgba(255,225,79,0.25)'; ctx.fillRect(stage.x - 26 * pulse, stage.y - 90, 52 * pulse, 90);
      ctx.strokeStyle = PALETTE.marker; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(stage.x, stage.y, 34 * pulse, 20 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath(); ctx.moveTo(stage.x, stage.y - 96); ctx.lineTo(stage.x - 10, stage.y - 76); ctx.lineTo(stage.x + 10, stage.y - 76); ctx.closePath(); ctx.fill();
    }
    if (state.packageCarried) { ctx.fillStyle = '#ffe14f'; ctx.fillRect(state.player.x - 8, state.player.y - 26, 16, 12); }
    for (const car of state.cars) drawCar(car, state.player.inCar && state.cars[state.player.carId] === car);
    for (const ped of state.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color, ped.down, false, false);
    for (const o of state.officers) drawPerson(o.x, o.y, o.angle, '#1c4fd9', false, false, true);
    for (const e of state.enemies) {
      if (!e.alive) { drawPerson(e.x, e.y, e.angle, '#5a2a33', true, false, false); continue; }
      drawPerson(e.x, e.y, e.angle, '#8c2f3d', false, false, true);
      ctx.fillStyle = '#222'; ctx.fillRect(e.x - 14, e.y - 26, 28, 5);
      ctx.fillStyle = '#ff4f6a'; ctx.fillRect(e.x - 14, e.y - 26, 28 * Math.max(0, e.health / 70), 5);
    }
    const p = state.player;
    if (!p.inCar) {
      drawPerson(p.x, p.y, p.angle, '#ff5a3d', false, true, false);
      // Aim line + crosshair when on foot.
      if (mouseWorld) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouseWorld.x, mouseWorld.y); ctx.stroke();
        ctx.strokeStyle = '#ffe14f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mouseWorld.x, mouseWorld.y, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mouseWorld.x - 13, mouseWorld.y); ctx.lineTo(mouseWorld.x - 5, mouseWorld.y);
        ctx.moveTo(mouseWorld.x + 5, mouseWorld.y); ctx.lineTo(mouseWorld.x + 13, mouseWorld.y);
        ctx.moveTo(mouseWorld.x, mouseWorld.y - 13); ctx.lineTo(mouseWorld.x, mouseWorld.y - 5);
        ctx.moveTo(mouseWorld.x, mouseWorld.y + 5); ctx.lineTo(mouseWorld.x, mouseWorld.y + 13); ctx.stroke();
      }
    }
    // Muzzle flash.
    if (state.flash > 0) {
      ctx.fillStyle = '#ffe14f'; ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 10, 0, Math.PI * 2); ctx.fill();
    }
    // Tracers and particles.
    ctx.strokeStyle = '#ffe14f'; ctx.lineWidth = 2;
    for (const t of state.tracers) { ctx.globalAlpha = Math.min(1, t.life / 0.09); ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function currentStageOf(state) {
    const m = MISSIONS[state.missionIndex];
    return m ? m.stages[state.stageIndex] : null;
  }

  function drawMinimap(state, city) {
    const mw = 218; const mh = 164; const x0 = VIEW.width - mw - 16; const y0 = 16;
    const sx = mw / 3200; const sy = mh / 2400;
    ctx.fillStyle = PALETTE.minimapBg; roundRect(x0, y0, mw, mh, 10); ctx.fill();
    ctx.strokeStyle = PALETTE.hudLine; ctx.stroke();
    ctx.save(); ctx.beginPath(); roundRect(x0, y0, mw, mh, 10); ctx.clip();
    ctx.fillStyle = '#2d5a33'; ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#1f6f8b'; ctx.fillRect(x0, y0, 130 * sx, mh);
    ctx.fillStyle = '#e8c98a'; ctx.fillRect(x0 + 130 * sx, y0, 130 * sx, mh);
    ctx.fillStyle = '#3a3b44';
    for (const rx of ROAD_XS) ctx.fillRect(x0 + rx * sx - 2, y0, 4, mh);
    for (const ry of ROAD_YS) ctx.fillRect(x0, y0 + ry * sy - 2, mw, 4);
    const dot = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2); ctx.fill(); };
    const stage = currentStageOf(state);
    if (stage && stage.x !== undefined) dot(stage.x, stage.y, 5, PALETTE.marker);
    for (const car of state.cars) dot(car.x, car.y, car.kind === 'police' ? 3.5 : 2.5, car.kind === 'police' ? '#4f8cff' : '#e8e8e8');
    for (const e of state.enemies) if (e.alive) dot(e.x, e.y, 3, '#ff4f6a');
    const p = state.player;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.player; ctx.beginPath(); ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
    // North arrow + district label.
    text('N', x0 + 12, y0 + 16, 13, '#ffffff', 'left', true);
    ctx.restore();
    text(districtAt(p.x, p.y), x0 + mw / 2, y0 + mh + 18, 13, PALETTE.text, 'center', true);
  }

  function drawHud(state, city, muted) {
    const p = state.player;
    // Top-left status block.
    panel(16, 16, 300, 108);
    // Health bar.
    ctx.fillStyle = '#222'; roundRect(30, 30, 170, 16, 8); ctx.fill();
    ctx.fillStyle = p.health > 30 ? PALETTE.health : PALETTE.healthLow;
    roundRect(30, 30, 170 * Math.max(0, p.health / 100), 16, 8); ctx.fill();
    text(`${Math.ceil(p.health)}`, 208, 43, 15, PALETTE.text, 'left', true);
    text(`$${state.money}`, 30, 74, 24, PALETTE.money, 'left', true);
    text(`Ammo ${p.ammo}`, 150, 74, 16, PALETTE.text, 'left', true);
    // Wanted stars.
    for (let i = 0; i < 5; i += 1) {
      text('★', 30 + i * 26, 106, 22, i < Math.ceil(state.wanted) ? PALETTE.star : 'rgba(255,255,255,0.22)', 'left', true);
    }
    text(state.wanted > 0 ? 'WANTED' : 'CLEAN', 168, 106, 13, state.wanted > 0 ? '#ff6a5a' : PALETTE.muted, 'left', true);
    // Mission tracker, bottom-left.
    const m = MISSIONS[state.missionIndex];
    const stage = currentStageOf(state);
    panel(16, VIEW.height - 118, 430, 102);
    if (state.completed) {
      text('★ ALL JOBS DONE — SOLMAR BAY IS YOURS ★', 30, VIEW.height - 88, 16, PALETTE.star, 'left', true);
      text('Free roam: steal cars, collect shells, dodge the law.', 30, VIEW.height - 60, 14, PALETTE.muted, 'left');
    } else if (m && stage) {
      text(m.title, 30, VIEW.height - 88, 16, PALETTE.marker, 'left', true);
      text(stage.label, 30, VIEW.height - 62, 15, PALETTE.text, 'left');
      text(stage.hint || '', 30, VIEW.height - 38, 13, PALETTE.muted, 'left');
      if (stage.type === 'defeat') text(`Down: ${state.defeated}/${stage.count}`, 30, VIEW.height - 88 + 0, 0, PALETTE.text, 'left');
    }
    // Speedometer when driving, bottom-right.
    if (p.inCar) {
      const car = state.cars[p.carId];
      const kmh = car ? Math.round(Math.abs(car.speed) * 0.32) : 0;
      panel(VIEW.width - 196, VIEW.height - 96, 180, 80);
      text(`${kmh}`, VIEW.width - 106, VIEW.height - 42, 38, PALETTE.text, 'center', true);
      text('km/h', VIEW.width - 106, VIEW.height - 24, 13, PALETTE.muted, 'center');
      if (car) { ctx.fillStyle = '#222'; roundRect(VIEW.width - 180, VIEW.height - 84, 148, 8, 4); ctx.fill(); ctx.fillStyle = car.health > 30 ? '#3ddc5a' : '#ff4f3d'; roundRect(VIEW.width - 180, VIEW.height - 84, 148 * Math.max(0, car.health / 100), 8, 4); ctx.fill(); }
    }
    // Message banner (story dialogue) bottom-centre, clear of the HUD panels.
    if (state.messageTimer > 0 && state.message) {
      ctx.fillStyle = 'rgba(10,8,22,0.8)';
      const w = Math.min(860, 40 + state.message.length * 7.2);
      roundRect((VIEW.width - w) / 2, 540, w, 44, 10); ctx.fill();
      text(state.message, VIEW.width / 2, 568, 15, PALETTE.text, 'center');
    } else if (state.toastTimer > 0 && state.toast) {
      text(state.toast, VIEW.width / 2, 568, 16, PALETTE.marker, 'center', true);
    }
    text(muted ? 'MUTED (M)' : 'M — mute', 16, VIEW.height - 132, 12, PALETTE.muted, 'left');
    drawMinimap(state, city);
  }

  function drawTitle(state, city) {
    ctx.fillStyle = 'rgba(20,10,40,0.42)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const grad = ctx.createLinearGradient(0, 90, 0, 240);
    grad.addColorStop(0, '#ffe14f'); grad.addColorStop(0.5, '#ff7a3d'); grad.addColorStop(1, '#ff4fd8');
    ctx.fillStyle = grad;
    text('SOLMAR BAY', VIEW.width / 2, 168, 84, '#ffe14f', 'center', true);
    ctx.fillStyle = '#ff4fd8'; text('SOLMAR BAY', VIEW.width / 2, 168, 84, '#ff4fd8', 'center', true);
    text('An open-world crime story · drive, steal, run, survive', VIEW.width / 2, 206, 20, PALETTE.text, 'center');
    let y = 252;
    for (const line of STORY_INTRO) { text(line, VIEW.width / 2, y, 16, PALETTE.muted, 'center'); y += 24; }
    panel(VIEW.width / 2 - 330, 372, 660, 150);
    text('HOW TO PLAY', VIEW.width / 2, 402, 15, PALETTE.marker, 'center', true);
    y = 430;
    for (const line of CONTROLS_TEXT) { text(line, VIEW.width / 2, y, 14, PALETTE.text, 'center'); y += 22; }
    text('ENTER — start a new game      C — continue saved game      M — mute', VIEW.width / 2, 556, 17, '#7dff5a', 'center', true);
    text('Progress saves automatically to this browser.', VIEW.width / 2, 586, 13, PALETTE.muted, 'center');
  }

  function drawPanelScreen(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(10,8,22,0.72)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(VIEW.width / 2 - 320, 190, 640, 150 + lines.length * 30);
    text(title, VIEW.width / 2, 258, 44, accent || PALETTE.text, 'center', true);
    let y = 306;
    for (const line of lines) { text(line, VIEW.width / 2, y, 17, PALETTE.text, 'center'); y += 30; }
    text(prompt, VIEW.width / 2, 190 + 150 + lines.length * 30 - 34, 17, PALETTE.marker, 'center', true);
  }

  /** Paint one frame. screen is a SCREEN_* constant; mouseWorld is the aim point or null. */
  function draw(state, city, screen, muted, mouseWorld) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
    const camX = Math.max(640, Math.min(3200 - 640, state.camera.x));
    const camY = Math.max(360, Math.min(2400 - 360, state.camera.y));
    // World layer: camera-centred transform (world coords -> screen).
    ctx.setTransform(view.scale, 0, 0, view.scale,
      view.x + (VIEW.width / 2 - camX + shakeX) * view.scale,
      view.y + (VIEW.height / 2 - camY + shakeY) * view.scale);
    drawWorld(state, city, camX, camY, screen === SCREEN_PLAY ? mouseWorld : null);
    // Screen layer: HUD, menus and overlays in 1280x720 logical coordinates.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) { drawTitle(state, city); return; }
    drawHud(state, city, muted);
    if (screen === SCREEN_PAUSED) drawPanelScreen('PAUSED', ['The city waits for no one — except right now.', `Money $${state.money} · ${MISSIONS[state.missionIndex] ? MISSIONS[state.missionIndex].title : 'All jobs done'}`], 'P / Esc — resume · Enter — save & quit to title');
    else if (screen === SCREEN_OVER) drawPanelScreen('WASTED', ['Marisol went down in the streets of Solmar Bay.', `You kept $${state.money} and your story so far.`], 'Enter — try again from your last save');
    else if (screen === SCREEN_BUSTED) drawPanelScreen('BUSTED', ['The Solmar Bay police took you in.', 'Fine: $100. Rosa posted bail.'], 'Enter — back on the streets');
    else if (screen === SCREEN_DONE) drawPanelScreen('SOLMAR BAY IS YOURS', ['All five story jobs complete.', `Final take: $${state.money}`], 'Enter — keep roaming free');
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
