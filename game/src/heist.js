// The heist itself: the thief, the patrols, the alarm, the tools, the score.
// One fixed step at a time; the renderer only paints what this module says.
import { ALARM, CAMERA, FIELD, GUARD, LIVES, RELICS, SCORE, STEP, THIEF, TOOLS } from './config.js';
import {
  angleDifference,
  createVault,
  distance,
  hasLineOfSight,
  moveCircle,
  pointInShadow,
} from './vault.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_OVER = 8;

export function createHeist(random) {
  const vault = createVault(random);
  return {
    vault,
    thief: { x: vault.entry.x, y: vault.entry.y, angle: -Math.PI / 2, moving: false, sprinting: false },
    alarm: 0,
    lives: LIVES,
    score: 0,
    time: 0,
    smokeCharges: TOOLS.smokeCharges,
    empCharges: TOOLS.empCharges,
    smokes: [],
    lockdownUntil: 0,
    ghost: true,
    spotted: false,
    won: false,
    over: false,
    // What the last step did, for the announcer and the HUD flash.
    lastLoot: null,
  };
}

export function resetHeist(heist, random) {
  const fresh = createHeist(random);
  Object.assign(heist, fresh);
}

function inSmoke(heist, x, y) {
  return heist.smokes.some((s) => distance(x, y, s.x, s.y) < s.radius);
}

function guardSeesThief(heist, guard) {
  const thief = heist.thief;
  const dist = distance(guard.x, guard.y, thief.x, thief.y);
  if (dist > GUARD.sightRange) return 0;
  const toThief = Math.atan2(thief.y - guard.y, thief.x - guard.x);
  if (Math.abs(angleDifference(guard.angle, toThief)) > GUARD.sightHalfAngle) return 0;
  if (!hasLineOfSight(guard.x, guard.y, thief.x, thief.y, heist.vault.covers)) return 0;
  if (inSmoke(heist, thief.x, thief.y)) return 0;
  const closeness = 1 - (dist / GUARD.sightRange) * 0.5;
  const inShadow = pointInShadow(thief.x, thief.y, heist.vault.shadows);
  return (inShadow ? ALARM.riseShadow : ALARM.riseGuard) * closeness;
}

function cameraSeesThief(heist, camera) {
  const thief = heist.thief;
  if (heist.time < camera.disabledUntil) return 0;
  const dist = distance(camera.x, camera.y, thief.x, thief.y);
  if (dist > CAMERA.sightRange) return 0;
  const toThief = Math.atan2(thief.y - camera.y, thief.x - camera.x);
  if (Math.abs(angleDifference(camera.angle, toThief)) > CAMERA.sightHalfAngle) return 0;
  if (!hasLineOfSight(camera.x, camera.y, thief.x, thief.y, heist.vault.covers)) return 0;
  if (inSmoke(heist, thief.x, thief.y)) return 0;
  const closeness = 1 - (dist / CAMERA.sightRange) * 0.5;
  const inShadow = pointInShadow(thief.x, thief.y, heist.vault.shadows);
  return (inShadow ? ALARM.riseShadow : ALARM.riseCamera) * closeness;
}

function stepGuard(heist, guard, dt) {
  const thief = heist.thief;
  const chasing = heist.time < heist.lockdownUntil;
  if (chasing) {
    const angle = Math.atan2(thief.y - guard.y, thief.x - guard.x);
    guard.angle += angleDifference(guard.angle, angle) * Math.min(1, dt * 6);
    const moved = moveCircle(
      guard.x,
      guard.y,
      Math.cos(angle) * GUARD.chaseSpeed * dt,
      Math.sin(angle) * GUARD.chaseSpeed * dt,
      GUARD.radius,
      heist.vault.covers,
    );
    guard.x = moved.x;
    guard.y = moved.y;
    return;
  }
  if (guard.wait > 0) {
    guard.wait -= dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const dx = target[0] - guard.x;
  const dy = target[1] - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.wait = 0.8;
    return;
  }
  const angle = Math.atan2(dy, dx);
  guard.angle += angleDifference(guard.angle, angle) * Math.min(1, dt * 8);
  const moved = moveCircle(
    guard.x,
    guard.y,
    Math.cos(angle) * GUARD.patrolSpeed * dt,
    Math.sin(angle) * GUARD.patrolSpeed * dt,
    GUARD.radius,
    heist.vault.covers,
  );
  guard.x = moved.x;
  guard.y = moved.y;
}

function stepCamera(heist, camera, dt) {
  if (heist.time < camera.disabledUntil) return;
  camera.angle += camera.direction * CAMERA.sweepSpeed * dt;
  const edge = camera.baseAngle + camera.arc / 2;
  const other = camera.baseAngle - camera.arc / 2;
  if (camera.angle > edge) {
    camera.angle = edge;
    camera.direction = -1;
  } else if (camera.angle < other) {
    camera.angle = other;
    camera.direction = 1;
  }
}

/**
 * Advance the heist one fixed step. `input` is { mx, my, sprint, smoke, emp }
 * with mx/my a unit direction (or 0,0) and smoke/emp true only on the press.
 * Returns an event bitmask; the caller turns it into screens and announcements.
 */
export function stepHeist(heist, input, dt = STEP) {
  heist.time += dt;
  heist.lastLoot = null;
  let events = EVENT_NONE;
  const thief = heist.thief;

  // Tools first: smoke hides, EMP blinds the cameras.
  if (input.smoke && heist.smokeCharges > 0) {
    heist.smokes.push({ x: thief.x, y: thief.y, radius: TOOLS.smokeRadius, until: heist.time + TOOLS.smokeSeconds });
    heist.smokeCharges -= 1;
  }
  if (input.emp && heist.empCharges > 0) {
    for (const camera of heist.vault.cameras) camera.disabledUntil = heist.time + TOOLS.empSeconds;
    heist.empCharges -= 1;
  }
  heist.smokes = heist.smokes.filter((s) => heist.time < s.until);

  // The thief moves; sprinting is fast and loud.
  const speed = input.sprint ? THIEF.sprintSpeed : THIEF.speed;
  thief.sprinting = input.sprint && (input.mx !== 0 || input.my !== 0);
  thief.moving = input.mx !== 0 || input.my !== 0;
  if (thief.moving) {
    const moved = moveCircle(
      thief.x,
      thief.y,
      input.mx * speed * dt,
      input.my * speed * dt,
      THIEF.radius,
      heist.vault.covers,
    );
    thief.x = moved.x;
    thief.y = moved.y;
    thief.angle = Math.atan2(input.my, input.mx);
  }
  if (thief.sprinting) {
    for (const guard of heist.vault.guards) {
      if (distance(guard.x, guard.y, thief.x, thief.y) < THIEF.noiseRadius) {
        const angle = Math.atan2(thief.y - guard.y, thief.x - guard.x);
        guard.angle += angleDifference(guard.angle, angle) * Math.min(1, dt * 4);
      }
    }
  }

  // Patrols, sweeps, and the eyes on the thief.
  for (const guard of heist.vault.guards) stepGuard(heist, guard, dt);
  for (const camera of heist.vault.cameras) stepCamera(heist, camera, dt);

  let rise = 0;
  for (const guard of heist.vault.guards) rise = Math.max(rise, guardSeesThief(heist, guard));
  for (const camera of heist.vault.cameras) rise = Math.max(rise, cameraSeesThief(heist, camera));
  heist.spotted = rise > 0;
  heist.alarm = Math.max(0, Math.min(100, heist.alarm + (heist.spotted ? rise : -ALARM.decay) * dt));

  // At 100 the hall locks down: every guard sprints at the thief.
  if (heist.alarm >= 100 && heist.time >= heist.lockdownUntil) {
    heist.lockdownUntil = heist.time + ALARM.lockdownSeconds;
    heist.ghost = false;
  }

  // A guard laying hands on the thief ends the run — or a life.
  for (const guard of heist.vault.guards) {
    if (distance(guard.x, guard.y, thief.x, thief.y) < GUARD.catchRadius + THIEF.radius) {
      heist.lives -= 1;
      heist.alarm = ALARM.caughtReset;
      heist.lockdownUntil = 0;
      thief.x = heist.vault.entry.x;
      thief.y = heist.vault.entry.y;
      thief.angle = -Math.PI / 2;
      heist.smokes = [];
      events |= EVENT_CAUGHT;
      if (heist.lives <= 0) {
        heist.over = true;
        events |= EVENT_OVER;
      }
      return events;
    }
  }

  // Walk over a relic to pocket it.
  for (const relic of heist.vault.relics) {
    if (!relic.taken && distance(thief.x, thief.y, relic.x, relic.y) < 30) {
      relic.taken = true;
      const value = RELICS.find((r) => r.id === relic.id).value;
      heist.score += value;
      heist.lastLoot = relic;
      events |= EVENT_LOOT;
    }
  }

  // All three relics, back at the door: the getaway pays off.
  const allTaken = heist.vault.relics.every((r) => r.taken);
  const zone = heist.vault.exitZone;
  if (
    allTaken &&
    thief.x >= zone.x &&
    thief.x <= zone.x + zone.width &&
    thief.y >= zone.y &&
    thief.y <= zone.y + zone.height
  ) {
    const timeBonus = Math.max(0, SCORE.timeBonusMax - Math.floor(heist.time) * 2);
    heist.score += SCORE.winBonus + timeBonus + (heist.ghost ? SCORE.ghostBonus : 0);
    heist.won = true;
    events |= EVENT_WIN;
  }
  return events;
}

// Field bounds for the HUD: how many relics are pocketed.
export function relicsTaken(heist) {
  return heist.vault.relics.filter((r) => r.taken).length;
}

export { FIELD };
