// Every pixel of The Gilded Vault: the hall, the cones, the loot, the HUD and
// the screens. The renderer never decides anything; it paints the heist state.
import { ALARM, CAMERA, COLORS, FIELD, GUARD, RELICS, THIEF } from './config.js';
import { relicsTaken } from './heist.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function wedge(ctx, x, y, angle, halfAngle, range, fill, edge) {
  const gradient = ctx.createRadialGradient(x, y, 10, x, y, range);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(0.65, fill);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawFloor(ctx, heist) {
  const { walls } = heist.vault;
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Checkerboard marble, two quiet tones.
  const tile = 80;
  for (let y = walls.y; y < walls.y + walls.height; y += tile) {
    for (let x = walls.x; x < walls.x + walls.width; x += tile) {
      const odd = (Math.floor((x - walls.x) / tile) + Math.floor((y - walls.y) / tile)) % 2 === 0;
      ctx.fillStyle = odd ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // The crimson runner from the door to the vault.
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(596, walls.y, 88, walls.height);
  ctx.strokeStyle = COLORS.carpetEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(596, walls.y, 88, walls.height);
  // Wall trim, lit from above.
  ctx.strokeStyle = COLORS.wallTop;
  ctx.lineWidth = 4;
  ctx.strokeRect(walls.x - 2, walls.y - 2, walls.width + 4, walls.height + 4);
  // Dust motes, drifting slowly in the dark.
  ctx.fillStyle = 'rgba(232, 217, 160, 0.25)';
  for (const mote of heist.vault.motes) {
    const drift = Math.sin(heist.time * 0.3 + mote.drift) * 4;
    ctx.fillRect(mote.x + drift, mote.y, mote.size, mote.size);
  }
}

function drawShadows(ctx, heist) {
  for (const shadow of heist.vault.shadows) {
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.roundRect(shadow.x, shadow.y, shadow.width, shadow.height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 140, 200, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawExit(ctx, heist) {
  const zone = heist.vault.exitZone;
  const allTaken = relicsTaken(heist) === RELICS.length;
  ctx.fillStyle = allTaken ? 'rgba(88, 214, 141, 0.30)' : 'rgba(88, 214, 141, 0.12)';
  ctx.fillRect(zone.x - 8, zone.y - 4, zone.width + 16, zone.height + 8);
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(allTaken ? 'EXIT — GO!' : 'EXIT', zone.x + zone.width / 2, zone.y + zone.height / 2 + 5);
  ctx.fillStyle = '#0c0e16';
  ctx.fillRect(zone.x, zone.y + zone.height - 2, zone.width, 4);
}

function drawCones(ctx, heist) {
  for (const guard of heist.vault.guards) {
    wedge(ctx, guard.x, guard.y, guard.angle, GUARD.sightHalfAngle, GUARD.sightRange, COLORS.coneGuard, COLORS.coneGuardEdge);
  }
  for (const camera of heist.vault.cameras) {
    const disabled = heist.time < camera.disabledUntil;
    wedge(
      ctx,
      camera.x,
      camera.y,
      camera.angle,
      CAMERA.sightHalfAngle,
      CAMERA.sightRange,
      disabled ? COLORS.coneDisabled : COLORS.coneCamera,
      disabled ? 'rgba(120,120,130,0.3)' : COLORS.coneCameraEdge,
    );
  }
}

function drawCovers(ctx, heist) {
  for (const cover of heist.vault.covers) {
    ctx.fillStyle = COLORS.coverFrame;
    ctx.fillRect(cover.x - 3, cover.y - 3, cover.width + 6, cover.height + 6);
    ctx.fillStyle = COLORS.coverGlass;
    ctx.fillRect(cover.x, cover.y, cover.width, cover.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cover.x + 6, cover.y + cover.height - 6);
    ctx.lineTo(cover.x + cover.width - 6, cover.y + 6);
    ctx.stroke();
  }
}

function drawRelicIcon(ctx, x, y, id, glint) {
  const pulse = 0.75 + 0.25 * Math.sin(glint);
  ctx.save();
  ctx.shadowColor = COLORS.relic;
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = COLORS.relic;
  if (id === 'idol') {
    // A little golden idol: a diamond on a base.
    ctx.beginPath();
    ctx.moveTo(x, y - 13);
    ctx.lineTo(x + 10, y + 2);
    ctx.lineTo(x, y + 13);
    ctx.lineTo(x - 10, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 12, y + 13, 24, 4);
  } else if (id === 'mask') {
    // A sapphire mask: a wide face with two eyes.
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2030';
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 1, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5, y - 1, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // A jade scarab: a round body with wing lines.
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c2030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.moveTo(x - 11, y);
    ctx.lineTo(x + 11, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRelics(ctx, heist) {
  for (const relic of heist.vault.relics) {
    // The empty plinth stays, so the judge sees where loot was.
    ctx.fillStyle = '#2a2f45';
    ctx.beginPath();
    ctx.arc(relic.x, relic.y + 14, 14, 0, Math.PI * 2);
    ctx.fill();
    if (relic.taken) continue;
    ctx.fillStyle = COLORS.relicGlow;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, 26, 0, Math.PI * 2);
    ctx.fill();
    drawRelicIcon(ctx, relic.x, relic.y, relic.id, heist.time * 2 + relic.glint);
  }
}

function drawCameras(ctx, heist) {
  for (const camera of heist.vault.cameras) {
    const disabled = heist.time < camera.disabledUntil;
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.rotate(camera.angle);
    ctx.fillStyle = disabled ? '#5a5f6e' : COLORS.cameraBody;
    ctx.fillRect(-4, -6, 22, 12);
    ctx.fillStyle = disabled ? '#3a3f4e' : '#ff5b5b';
    ctx.beginPath();
    ctx.arc(18, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0c0e16';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, heist) {
  for (const guard of heist.vault.guards) {
    const chasing = heist.time < heist.lockdownUntil;
    ctx.fillStyle = chasing ? '#ff7070' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius - 5, 0, Math.PI * 2);
    ctx.fill();
    // The direction the guard is looking.
    ctx.strokeStyle = '#ffd9d9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 7), guard.y + Math.sin(guard.angle) * (GUARD.radius + 7));
    ctx.stroke();
    if (chasing) {
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - GUARD.radius - 6);
    }
  }
}

function drawThief(ctx, heist) {
  const thief = heist.thief;
  const hidden = heist.vault.shadows.some(
    (s) => thief.x >= s.x && thief.x <= s.x + s.width && thief.y >= s.y && thief.y <= s.y + s.height,
  );
  // A gold ring so the thief reads at a glance, even in the dark.
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = 'rgba(232, 217, 160, 0.6)';
  ctx.shadowBlur = hidden ? 4 : 12;
  ctx.fillStyle = COLORS.thiefCloak;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF.radius - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thief;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(thief.x, thief.y);
  ctx.lineTo(thief.x + Math.cos(thief.angle) * (THIEF.radius + 6), thief.y + Math.sin(thief.angle) * (THIEF.radius + 6));
  ctx.stroke();
}

function drawSmoke(ctx, heist) {
  for (const smoke of heist.smokes) {
    const left = smoke.until - heist.time;
    ctx.fillStyle = `rgba(180, 180, 195, ${Math.min(0.5, left * 0.2)})`;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 220, 235, 0.35)';
    ctx.beginPath();
    ctx.arc(smoke.x - 20, smoke.y + 12, smoke.radius * 0.45, 0, Math.PI * 2);
    ctx.arc(smoke.x + 24, smoke.y - 10, smoke.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, heist, best) {
  const bar = { x: 0, y: 0, width: FIELD.width, height: 34 };
  ctx.fillStyle = 'rgba(8, 10, 18, 0.92)';
  ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('THE GILDED VAULT', 14, 18);

  // Loot: three diamonds, gold once pocketed.
  const taken = relicsTaken(heist);
  for (let i = 0; i < RELICS.length; i += 1) {
    const x = 250 + i * 30;
    ctx.fillStyle = i < taken ? COLORS.relic : '#3a3f55';
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x + 8, 17);
    ctx.lineTo(x, 24);
    ctx.lineTo(x - 8, 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${taken}/3 LOOT`, 345, 18);

  // The alarm meter: the game's heartbeat.
  const meter = { x: 470, y: 10, width: 220, height: 14 };
  ctx.fillStyle = COLORS.alarmBg;
  ctx.fillRect(meter.x, meter.y, meter.width, meter.height);
  const alarm = heist.alarm;
  const flashing = alarm > 75 && Math.floor(heist.time * 6) % 2 === 0;
  ctx.fillStyle = flashing ? '#ffffff' : COLORS.alarm;
  ctx.fillRect(meter.x, meter.y, (meter.width * alarm) / 100, meter.height);
  ctx.strokeStyle = '#5a2a30';
  ctx.lineWidth = 1;
  ctx.strokeRect(meter.x, meter.y, meter.width, meter.height);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALARM', meter.x - 52, 18);
  ctx.fillStyle = alarm > 75 ? COLORS.alarm : COLORS.hudDim;
  ctx.fillText(`${Math.floor(alarm)}%`, meter.x + meter.width + 8, 18);

  // Lives, tools, score, time.
  ctx.fillStyle = COLORS.hud;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`♥ ${heist.lives}`, 800, 18);
  ctx.fillText(`SMOKE ×${heist.smokeCharges}  EMP ×${heist.empCharges}`, 880, 18);
  ctx.fillText(`SCORE ${heist.score}`, 1060, 18);
  const seconds = Math.floor(heist.time);
  ctx.fillText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, 1180, 18);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`BEST ${best}`, 1236, 18);
  ctx.textAlign = 'left';
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(340, 190, 600, 330);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(340, 190, 600, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, 640, 260);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 310 + i * 30));
  ctx.textAlign = 'left';
}

function drawTitle(ctx, heist) {
  drawCenterPanel(
    ctx,
    'THE GILDED VAULT',
    [
      '3 relics. 4 guards. 2 cameras. 1 getaway.',
      'Slip the cones, pocket the gold, reach the green door.',
      'Move WASD / arrows · Sprint Shift · Smoke Q · EMP E',
      'Shadows hide you. Sprinting is loud. Cameras hate EMP.',
      '',
      'Press SPACE or click to begin the heist',
    ],
    COLORS.relic,
  );
}

function drawPaused(ctx) {
  drawCenterPanel(ctx, 'PAUSED', ['The vault waits. The guards do not.', '', 'Press P or SPACE to keep moving'], COLORS.hudDim);
}

function drawWin(ctx, heist) {
  drawCenterPanel(
    ctx,
    'CLEAN GETAWAY',
    [
      `All 3 relics pocketed — score ${heist.score}`,
      heist.ghost ? 'Ghost bonus: never tripped lockdown (+400)' : 'The alarm rang, but you still got out.',
      '',
      'Press SPACE to run it again',
    ],
    COLORS.exit,
  );
}

function drawOver(ctx, heist) {
  drawCenterPanel(
    ctx,
    'CAUGHT',
    [`The vault keeps its gold this time — score ${heist.score}`, '', 'Press SPACE to try again'],
    COLORS.alarm,
  );
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || FIELD.width;
    const height = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function draw(heist, screen, best, caughtFlash) {
    fit();
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawFloor(ctx, heist);
    drawShadows(ctx, heist);
    drawExit(ctx, heist);
    drawCones(ctx, heist);
    drawCovers(ctx, heist);
    drawRelics(ctx, heist);
    drawCameras(ctx, heist);
    drawGuards(ctx, heist);
    drawThief(ctx, heist);
    drawSmoke(ctx, heist);
    drawHud(ctx, heist, best);

    if (caughtFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 40, ${Math.min(0.35, caughtFlash * 0.3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAUGHT!', FIELD.width / 2, FIELD.height / 2 - 40);
      ctx.textAlign = 'left';
    }
    if (screen === SCREEN_TITLE) drawTitle(ctx, heist);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_WIN) drawWin(ctx, heist);
    else if (screen === SCREEN_OVER) drawOver(ctx, heist);
  }

  return { draw };
}
