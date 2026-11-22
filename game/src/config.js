// Tuning for The Gilded Vault: one night, one hall, three relics, four guards.
// Everything the other modules need to agree on lives here, so a balance tweak
// is one number in one place.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const THIEF = {
  radius: 14,
  speed: 155,
  sprintSpeed: 245,
  // Sprinting is loud: guards inside this radius turn toward the noise.
  noiseRadius: 130,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  chaseSpeed: 132,
  // A guard sees this far, inside this half-angle, with a clear line of sight.
  sightRange: 195,
  sightHalfAngle: 0.61,
  catchRadius: 20,
};

export const CAMERA = {
  sightRange: 235,
  sightHalfAngle: 0.42,
  // Degrees per second the camera sweeps; it turns at each end of its arc.
  sweepSpeed: 0.55,
  sweepArc: 0.9,
};

// The alarm is the game's clock: 0 is calm, 100 is lockdown.
export const ALARM = {
  riseGuard: 30, // per second, spotted by a guard at point-blank range
  riseCamera: 24, // per second, spotted by a camera at point-blank range
  riseShadow: 6, // per second, spotted while standing in a shadow patch
  decay: 11, // per second, while nobody sees the thief
  lockdownSeconds: 6, // how long guards sprint at the thief after 100
  caughtReset: 40, // alarm level after being caught once
};

export const TOOLS = {
  smokeCharges: 3,
  smokeSeconds: 4.5,
  smokeRadius: 85,
  empCharges: 2,
  empSeconds: 8,
};

export const LIVES = 3;

export const RELICS = [
  { id: 'idol', name: 'Gilded Idol', value: 500 },
  { id: 'mask', name: 'Sapphire Mask', value: 300 },
  { id: 'scarab', name: 'Jade Scarab', value: 200 },
];

export const SCORE = {
  winBonus: 500,
  ghostBonus: 400, // never tripped lockdown
  timeBonusMax: 300, // shrinks 2 points a second after the heist starts
};

export const BEST_KEY = 'gilded-vault-best';

// Palette: a museum at night. Gold is loot, red is danger, teal is shadow.
export const COLORS = {
  floorA: '#171a26',
  floorB: '#1c2030',
  carpet: '#3d2436',
  carpetEdge: '#6b3a58',
  wall: '#0c0e16',
  wallTop: '#2a2f45',
  coverGlass: '#4a5a78',
  coverFrame: '#8a6d3b',
  shadow: 'rgba(6, 8, 18, 0.55)',
  coneGuard: 'rgba(255, 64, 64, 0.26)',
  coneGuardEdge: 'rgba(255, 90, 90, 0.6)',
  coneCamera: 'rgba(80, 255, 150, 0.16)',
  coneCameraEdge: 'rgba(80, 255, 150, 0.45)',
  coneDisabled: 'rgba(120, 120, 130, 0.10)',
  thief: '#e8d9a0',
  thiefCloak: '#232742',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  cameraBody: '#9aa5b8',
  relic: '#ffd76a',
  relicGlow: 'rgba(255, 215, 106, 0.35)',
  exit: '#58d68d',
  hud: '#e8e4d8',
  hudDim: '#9a94a8',
  alarm: '#ff5252',
  alarmBg: '#3a1d24',
};
