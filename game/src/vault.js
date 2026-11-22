// The vault hall itself: one room, its cover, its shadows, its patrols.
// Pure layout data plus the two geometry questions the heist asks all the time:
// can this watcher see that spot, and does this circle fit here?
import { FIELD } from './config.js';

// The hall's inner walls: the thief walks inside this rectangle.
export const WALLS = { x: 36, y: 36, width: 1208, height: 648 };

// Display cases and pedestals. They block movement and block sight.
const COVERS = [
  { x: 218, y: 150, width: 76, height: 150 }, // left wing, tall case
  { x: 218, y: 420, width: 76, height: 150 }, // left wing, tall case
  { x: 986, y: 150, width: 76, height: 150 }, // right wing, tall case
  { x: 986, y: 420, width: 76, height: 150 }, // right wing, tall case
  { x: 520, y: 330, width: 240, height: 56 }, // centre counter, splits the hall
  { x: 430, y: 120, width: 60, height: 60 }, // pedestal, north-west
  { x: 790, y: 120, width: 60, height: 60 }, // pedestal, north-east
  { x: 600, y: 520, width: 80, height: 48 }, // low case, south centre
];

// Shadow patches: standing in one, a watcher spots you far slower.
const SHADOWS = [
  { x: 330, y: 420, width: 150, height: 120 },
  { x: 800, y: 420, width: 150, height: 120 },
  { x: 560, y: 170, width: 160, height: 90 },
  { x: 90, y: 300, width: 90, height: 130 },
  { x: 1100, y: 300, width: 90, height: 130 },
];

// The three relics, each on its own plinth.
const RELIC_SPOTS = [
  { id: 'idol', x: 640, y: 108 },
  { id: 'mask', x: 176, y: 176 },
  { id: 'scarab', x: 1104, y: 176 },
];

// Four guards, each walking a beat. Facing follows the walk.
const GUARD_BEATS = [
  { waypoints: [[350, 300], [930, 300]], phase: 0.0 }, // middle sweep
  { waypoints: [[176, 150], [176, 560]], phase: 0.25 }, // left wing
  { waypoints: [[1104, 150], [1104, 560]], phase: 0.5 }, // right wing
  { waypoints: [[450, 128], [830, 128]], phase: 0.75 }, // vault watch
];

// Two wall cameras, each sweeping its arc.
const CAMERA_MOUNTS = [
  { x: 60, y: 60, baseAngle: Math.PI / 4, arc: 0.9 }, // north-west, looks down-right
  { x: 1220, y: 60, baseAngle: (3 * Math.PI) / 4, arc: 0.9 }, // north-east, looks down-left
];

export const ENTRY = { x: 640, y: 648 };
export const EXIT_ZONE = { x: 596, y: 648, width: 88, height: 36 };

export function createVault(random) {
  const jitter = (value) => value + random.range(-6, 6);
  return {
    walls: WALLS,
    covers: COVERS.map((c) => ({ ...c })),
    shadows: SHADOWS.map((s) => ({ ...s })),
    relics: RELIC_SPOTS.map((spot) => ({
      ...spot,
      taken: false,
      // A little sparkle phase so the loot glints on its own clock.
      glint: random.next() * Math.PI * 2,
    })),
    guards: GUARD_BEATS.map((beat, index) => {
      const start = beat.waypoints[0];
      return {
        id: index,
        x: jitter(start[0]),
        y: jitter(start[1]),
        angle: 0,
        waypointIndex: 1,
        waypoints: beat.waypoints,
        phase: beat.phase,
        // Each guard idles a breath at the end of its beat.
        wait: 0,
      };
    }),
    cameras: CAMERA_MOUNTS.map((mount) => ({
      ...mount,
      angle: mount.baseAngle,
      direction: 1,
      disabledUntil: 0,
    })),
    entry: { ...ENTRY },
    exitZone: { ...EXIT_ZONE },
    // Dust motes drifting in the light, seeded so screenshots match.
    motes: Array.from({ length: 40 }, () => ({
      x: random.range(WALLS.x, WALLS.x + WALLS.width),
      y: random.range(WALLS.y, WALLS.y + WALLS.height),
      size: random.range(1, 2.4),
      drift: random.range(2, 7),
    })),
  };
}

// Does the segment from (ax, ay) to (bx, by) cross this rectangle?
function segmentHitsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  for (const [origin, delta, min, max] of [
    [ax, dx, rect.x, rect.x + rect.width],
    [ay, dy, rect.y, rect.y + rect.height],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return false;
    } else {
      let t1 = (min - origin) / delta;
      let t2 = (max - origin) / delta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

export function hasLineOfSight(ax, ay, bx, by, covers) {
  for (const cover of covers) {
    if (segmentHitsRect(ax, ay, bx, by, cover)) return false;
  }
  return true;
}

export function pointInShadow(x, y, shadows) {
  return shadows.some((s) => x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height);
}

// Keep a circle inside the walls and out of the cover: move one axis at a time
// so the thief slides along a case instead of sticking to it.
export function moveCircle(x, y, dx, dy, radius, covers) {
  const walls = WALLS;
  const blocked = (nx, ny) =>
    nx - radius < walls.x ||
    nx + radius > walls.x + walls.width ||
    ny - radius < walls.y ||
    ny + radius > walls.y + walls.height ||
    covers.some(
      (c) =>
        nx + radius > c.x && nx - radius < c.x + c.width && ny + radius > c.y && ny - radius < c.y + c.height,
    );
  let nextX = x;
  let nextY = y;
  if (!blocked(x + dx, y)) nextX = x + dx;
  if (!blocked(nextX, y + dy)) nextY = y + dy;
  return { x: nextX, y: nextY };
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Smallest absolute turn between two headings, in radians.
export function angleDifference(a, b) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
