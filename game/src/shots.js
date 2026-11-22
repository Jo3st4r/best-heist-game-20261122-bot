// The screenshot scenes behind ?shot=title|heist|loot|escape. Each one plays the
// real rules forward from a fresh heist for a fixed number of steps, steered by
// a waypoint autopilot that seeks its next stop, flees a guard that gets too
// close, and spends a smoke or an EMP when it is being watched — so the frame
// is what a real game looks like, and the same seed always gives the same frame.
//
// The waypoints run down the hall's open lanes, never straight at a case: a
// thief that pushes head-on into a display case sticks there, so the pilot
// watches for that (barely moved while trying) and slides sideways around it.
import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN, stepHeist } from './heist.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { distance } from './vault.js';

const SAMPLE = STEP;

// Steer toward the current waypoint, or straight away from a guard too close.
// `pilot` carries the stuck-detector state between steps.
function autopilot(heist, waypoints, pilot) {
  const thief = heist.thief;
  let nearest = null;
  let nearestDist = Infinity;
  for (const guard of heist.vault.guards) {
    const dist = distance(guard.x, guard.y, thief.x, thief.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = guard;
    }
  }
  if (nearest && nearestDist < 70) {
    const dx = thief.x - nearest.x;
    const dy = thief.y - nearest.y;
    const length = Math.hypot(dx, dy) || 1;
    return { mx: dx / length, my: dy / length, sprint: false };
  }
  const target = waypoints[Math.min(pilot.index, waypoints.length - 1)];
  const dx = target[0] - thief.x;
  const dy = target[1] - thief.y;
  const dist = Math.hypot(dx, dy);
  // Waypoints sit exactly on the relics: arriving here always pockets one.
  if (dist < 20 && pilot.index < waypoints.length - 1) pilot.index += 1;
  const length = Math.hypot(dx, dy) || 1;
  let mx = dx / length;
  let my = dy / length;
  // Stuck against a case: slide sideways around it for a while.
  const moved = distance(thief.x, thief.y, pilot.lastX, pilot.lastY);
  if (pilot.slidingUntil > heist.time) {
    const px = -my * pilot.slideDir;
    const py = mx * pilot.slideDir;
    mx = mx * 0.35 + px;
    my = my * 0.35 + py;
    const slideLength = Math.hypot(mx, my) || 1;
    mx /= slideLength;
    my /= slideLength;
  } else if (moved < 1.2 && (mx !== 0 || my !== 0)) {
    pilot.slideDir = pilot.slideDir === 0 ? 1 : -pilot.slideDir;
    pilot.slidingUntil = heist.time + 1.4;
  }
  pilot.lastX = thief.x;
  pilot.lastY = thief.y;
  // Sprint the open stretches: fast, and nobody close enough to hear it.
  const sprint = nearestDist > 160 && !heist.spotted;
  return { mx, my, sprint };
}

// Run the heist forward along `waypoints` for at most `seconds`, spending
// tools when watched. Returns the events seen, so a scene can end on a win.
function runForward(heist, waypoints, seconds) {
  const pilot = { index: 0, lastX: heist.thief.x, lastY: heist.thief.y, slideDir: 0, slidingUntil: 0 };
  let events = 0;
  let lastToolAt = -10;
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const steer = autopilot(heist, waypoints, pilot);
    const useSmoke = heist.spotted && heist.smokeCharges > 0 && heist.time - lastToolAt > 6;
    const useEmp = heist.spotted && heist.empCharges > 0 && heist.time - lastToolAt > 6 && !useSmoke;
    if (useSmoke || useEmp) lastToolAt = heist.time;
    events |= stepHeist(heist, { mx: steer.mx, my: steer.my, sprint: steer.sprint, smoke: useSmoke, emp: useEmp });
    if (events & EVENT_WIN) break;
    // A caught thief restarts at the door; keep the scene going.
    if (events & EVENT_CAUGHT) events &= ~EVENT_CAUGHT;
  }
  return events;
}

/**
 * Set `heist` to the named scene and return the screen to draw over it and
 * the best score to show. Any unknown name stages the title.
 */
export function stageShot(name, heist) {
  if (name === 'heist') {
    // Mid-heist: the scarab pocketed, the thief slipping up the shadow lane.
    // East lane up to the scarab, then west through the shadow patches.
    runForward(
      heist,
      [
        [1090, 480],
        [1090, 300],
        [1104, 176],
        [1000, 320],
        [860, 460],
        [720, 360],
      ],
      24,
    );
    return { screen: SCREEN_PLAY, best: heist.score };
  }
  if (name === 'loot') {
    // At the idol, the vault guard closing in, the alarm high.
    // East lane past the centre counter, then in to the vault.
    runForward(
      heist,
      [
        [700, 600],
        [800, 470],
        [800, 260],
        [700, 160],
        [640, 108],
      ],
      18,
    );
    return { screen: SCREEN_PLAY, best: heist.score };
  }
  if (name === 'escape') {
    // The whole job: scarab, mask, idol, then out the door.
    const events = runForward(
      heist,
      [
        [1090, 480],
        [1090, 300],
        [1104, 176],
        [900, 280],
        [800, 280],
        [300, 280],
        [176, 320],
        [176, 176],
        [400, 300],
        [800, 280],
        [700, 160],
        [640, 108],
        [800, 300],
        [800, 600],
        [640, 660],
      ],
      100,
    );
    const won = (events & EVENT_WIN) !== 0;
    return { screen: won ? SCREEN_WIN : SCREEN_PLAY, best: heist.score };
  }
  // Title: let the patrols walk a while under the title card.
  for (let i = 0; i < 5 / SAMPLE; i += 1) {
    stepHeist(heist, { mx: 0, my: 0, sprint: false, smoke: false, emp: false });
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
