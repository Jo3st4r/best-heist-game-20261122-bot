// Boot and the one loop: input is read every frame, the heist advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught (a flash, then play again) and win or game over.
//
// ?seed=N fixes the night. ?shot=title|heist|loot|escape (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createHeist, EVENT_CAUGHT, EVENT_LOOT, EVENT_OVER, EVENT_WIN, resetHeist, stepHeist } from './heist.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
const CAUGHT_FLASH_SECONDS = 1.4;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const heist = createHeist(random);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, heist);
  // For the maker's own checks: what the staged scene actually holds.
  window.__shotState = {
    screen: scene.screen,
    score: heist.score,
    loot: heist.vault.relics.filter((r) => r.taken).length,
    alarm: Math.round(heist.alarm),
    lives: heist.lives,
    x: Math.round(heist.thief.x),
    y: Math.round(heist.thief.y),
    time: Math.round(heist.time),
  };
  let painted = 0;
  function paint() {
    renderer.draw(heist, scene.screen, scene.best, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let caughtFlash = 0;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetHeist(heist, createRandom(seed));
    accumulator = 0;
    caughtFlash = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Three relics, then the green door.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (heist.score > best) {
      best = heist.score;
      saveBest(best);
    }
    announce(won ? `Clean getaway. Score ${heist.score}.` : `Caught. Score ${heist.score}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      // The hall lives behind the title: patrols walk, cameras sweep.
      stepHeist(heist, { mx: 0, my: 0, sprint: false, smoke: false, emp: false });
      return;
    }
    const direction = input.direction();
    const events = stepHeist(heist, {
      mx: direction.mx,
      my: direction.my,
      sprint: input.sprinting(),
      smoke: (actions & ACTION_SMOKE) !== 0,
      emp: (actions & ACTION_EMP) !== 0,
    });
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_CAUGHT) {
      caughtFlash = CAUGHT_FLASH_SECONDS;
      announce(heist.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${heist.lives} lives left.`);
    } else if (events & EVENT_LOOT && heist.lastLoot) {
      announce(`Pocketed the ${heist.lastLoot.name}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += dt;
    const actions = input.takeActions();
    handleActions(actions);
    if (caughtFlash > 0) caughtFlash -= dt;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      // Edge-triggered presses (smoke, EMP) fire on the first sub-step only,
      // so one key press is never spent twice in a slow frame.
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(heist, screen, best, Math.max(0, caughtFlash));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
