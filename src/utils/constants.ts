// ── Player ──────────────────────────────────────────────────
export const PLAYER = {
  SPEED: 25,
  ROTATION_SPEED: 3,
  MAX_HEALTH: 100,
  INVINCIBILITY_DURATION: 1.5, // seconds after taking damage
  FIRE_RATE: 0.15, // seconds between shots
  RAPID_FIRE_RATE: 0.06,
  BOUNDARY_X: 40,
  BOUNDARY_Y: 25,
  SIZE: 1.5, // collision radius
  TILT_AMOUNT: 0.4, // ship tilt when strafing (radians)
} as const;

// ── Projectiles ─────────────────────────────────────────────
export const PROJECTILE = {
  SPEED: 80,
  LIFETIME: 2.5, // seconds
  SIZE: 0.3,
  DAMAGE: 25,
  POOL_SIZE: 60,
  COLOR: 0x00ffaa,
  ENEMY_COLOR: 0xff4444,
  ENEMY_SPEED: 40,
  ENEMY_DAMAGE: 15,
} as const;

// ── Asteroids ───────────────────────────────────────────────
export const ASTEROID = {
  SPEED_MIN: 8,
  SPEED_MAX: 20,
  ROTATION_SPEED_MIN: 0.5,
  ROTATION_SPEED_MAX: 2.0,
  SIZES: {
    SMALL: { radius: 1.0, health: 25, score: 100 },
    MEDIUM: { radius: 2.0, health: 50, score: 50 },
    LARGE: { radius: 3.5, health: 100, score: 25 },
  },
  NOISE_AMOUNT: 0.3, // vertex displacement factor
  SPAWN_Z: -120, // spawn distance in front of camera
  DESPAWN_Z: 50, // remove when behind camera
  MAX_COUNT: 40,
  COLOR: 0x888888,
} as const;

// ── Enemies ─────────────────────────────────────────────────
export const ENEMY = {
  SPEED: 12,
  STRAFE_SPEED: 8,
  STRAFE_RANGE: 15,
  MAX_HEALTH: 75,
  FIRE_RATE: 1.5, // seconds between shots
  SIZE: 1.5,
  SCORE: 200,
  SPAWN_Z: -120,
  DESPAWN_Z: 50,
  MAX_COUNT: 10,
  COLOR: 0xff3333,
  AGGRO_RANGE: 60,
} as const;

// ── Power-ups ───────────────────────────────────────────────
export const POWERUP = {
  SPEED: 10,
  SIZE: 1.2,
  BOB_SPEED: 2, // vertical bobbing speed
  BOB_AMPLITUDE: 0.5,
  ROTATION_SPEED: 1.5,
  SPAWN_Z: -100,
  DESPAWN_Z: 50,
  TYPES: {
    SHIELD: { duration: 8, color: 0x4488ff },
    RAPID_FIRE: { duration: 6, color: 0xffaa00 },
    HEALTH: { amount: 40, color: 0x44ff44 },
  },
} as const;

// ── Spawning ────────────────────────────────────────────────
export const SPAWN = {
  ASTEROID_INTERVAL: 0.8, // base seconds between spawns
  ASTEROID_MIN_INTERVAL: 0.2,
  ENEMY_INTERVAL: 5.0,
  ENEMY_MIN_INTERVAL: 1.5,
  POWERUP_INTERVAL: 12.0,
  POWERUP_MIN_INTERVAL: 8.0,
  DIFFICULTY_RAMP_TIME: 120, // seconds to reach max difficulty
  SPAWN_X_RANGE: 35,
  SPAWN_Y_RANGE: 20,
} as const;

// ── Particles ───────────────────────────────────────────────
export const PARTICLES = {
  EXPLOSION_COUNT: 30,
  EXPLOSION_SPEED: 15,
  EXPLOSION_LIFETIME: 0.8,
  TRAIL_COUNT: 5,
  TRAIL_LIFETIME: 0.3,
  IMPACT_COUNT: 10,
  IMPACT_SPEED: 8,
  IMPACT_LIFETIME: 0.4,
  MAX_PARTICLES: 500,
  PICKUP_COUNT: 20,
  PICKUP_SPEED: 10,
  PICKUP_LIFETIME: 0.6,
} as const;

// ── Scoring ─────────────────────────────────────────────────
export const SCORE = {
  COMBO_WINDOW: 2.0, // seconds to chain kills for combo
  COMBO_MULTIPLIER_MAX: 5,
  SURVIVAL_POINTS_PER_SECOND: 1,
} as const;

// ── Camera / Scene ──────────────────────────────────────────
export const SCENE = {
  BACKGROUND_COLOR: 0x000011,
  FOG_DENSITY: 0.0008,
  STAR_COUNT: 2000,
  STAR_SPREAD: 600,
  CAMERA_OFFSET_Y: 10,
  CAMERA_OFFSET_Z: 30,
  SCREEN_SHAKE_DECAY: 5.0,
  SCREEN_SHAKE_INTENSITY: 0.5,
} as const;

// ── Colors (reusable palette) ───────────────────────────────
export const COLORS = {
  PLAYER_HULL: 0x2288ff,
  PLAYER_ACCENT: 0x44aaff,
  PLAYER_ENGINE: 0x00ccff,
  ENEMY_HULL: 0xff3333,
  ENEMY_ACCENT: 0xff6644,
  ASTEROID_BASE: 0x888888,
  ASTEROID_DARK: 0x555555,
  EXPLOSION: 0xff8800,
  SHIELD: 0x4488ff,
  HEALTH: 0x44ff44,
  RAPID_FIRE: 0xffaa00,
  PROJECTILE_PLAYER: 0x00ffaa,
  PROJECTILE_ENEMY: 0xff4444,
  UI_TEXT: '#ffffff',
  UI_HEALTH_BAR: '#44ff44',
  UI_HEALTH_BAR_LOW: '#ff4444',
  UI_SCORE: '#ffcc00',
} as const;
