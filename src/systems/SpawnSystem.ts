import { AsteroidPool, AsteroidSize } from '../entities/Asteroid';
import { SPAWN, ENEMY } from '../utils/constants';

/** Generic pool interface for future entity pools (Enemy, PowerUp) */
interface Spawnable {
  spawn(...args: unknown[]): unknown;
  getActive(): unknown[];
}

/**
 * Manages spawning of asteroids, enemies, and power-ups
 * with progressive difficulty scaling over elapsed game time.
 */
export class SpawnSystem {
  private asteroidPool: AsteroidPool;
  private enemyPool: Spawnable | null = null;
  private powerUpPool: Spawnable | null = null;

  private asteroidTimer = 0;
  private enemyTimer = 0;
  private powerUpTimer = 0;

  /** Current difficulty from 0 (start) to 1 (max) */
  public difficulty = 0;

  constructor(asteroidPool: AsteroidPool) {
    this.asteroidPool = asteroidPool;
  }

  /** Register an enemy pool once the Enemy entity is implemented */
  public setEnemyPool(pool: Spawnable): void {
    this.enemyPool = pool;
  }

  /** Register a power-up pool once the PowerUp entity is implemented */
  public setPowerUpPool(pool: Spawnable): void {
    this.powerUpPool = pool;
  }

  /** Call each frame with delta time and total elapsed time */
  public update(delta: number, elapsed: number): void {
    this.difficulty = Math.min(elapsed / SPAWN.DIFFICULTY_RAMP_TIME, 1);

    this.updateAsteroidSpawning(delta);
    this.updateEnemySpawning(delta);
    this.updatePowerUpSpawning(delta);
  }

  // ── Asteroid spawning ──────────────────────────────────────

  private updateAsteroidSpawning(delta: number): void {
    this.asteroidTimer -= delta;
    if (this.asteroidTimer > 0) return;

    const interval = this.getScaledInterval(
      SPAWN.ASTEROID_INTERVAL,
      SPAWN.ASTEROID_MIN_INTERVAL,
    );
    this.asteroidTimer = interval;

    // Pick asteroid size weighted by difficulty:
    // Early game: mostly small/medium, late game: more large
    const sizeKey = this.pickAsteroidSize();
    this.asteroidPool.spawn(sizeKey);
  }

  /** Weight asteroid size toward larger as difficulty increases */
  private pickAsteroidSize(): AsteroidSize {
    const roll = Math.random();
    // At difficulty 0: 50% small, 35% medium, 15% large
    // At difficulty 1: 20% small, 35% medium, 45% large
    const largeChance = 0.15 + this.difficulty * 0.30;
    const mediumChance = 0.35;

    if (roll < largeChance) return 'LARGE';
    if (roll < largeChance + mediumChance) return 'MEDIUM';
    return 'SMALL';
  }

  // ── Enemy spawning ─────────────────────────────────────────

  private updateEnemySpawning(delta: number): void {
    if (!this.enemyPool) return;

    this.enemyTimer -= delta;
    if (this.enemyTimer > 0) return;

    const interval = this.getScaledInterval(
      SPAWN.ENEMY_INTERVAL,
      SPAWN.ENEMY_MIN_INTERVAL,
    );
    this.enemyTimer = interval;

    // Only start spawning enemies after some initial time
    if (this.difficulty < 0.1) return;

    // Spawn wave: 1 enemy early, up to 3 at max difficulty
    const waveSize = 1 + Math.floor(this.difficulty * 2);
    const activeCount = this.enemyPool.getActive().length;

    for (let i = 0; i < waveSize; i++) {
      if (activeCount + i >= ENEMY.MAX_COUNT) break;
      this.enemyPool.spawn();
    }
  }

  // ── Power-up spawning ──────────────────────────────────────

  private updatePowerUpSpawning(delta: number): void {
    if (!this.powerUpPool) return;

    this.powerUpTimer -= delta;
    if (this.powerUpTimer > 0) return;

    const interval = this.getScaledInterval(
      SPAWN.POWERUP_INTERVAL,
      SPAWN.POWERUP_MIN_INTERVAL,
    );
    this.powerUpTimer = interval;

    this.powerUpPool.spawn();
  }

  // ── Helpers ────────────────────────────────────────────────

  /** Linearly scale an interval from base down to min based on difficulty */
  private getScaledInterval(base: number, min: number): number {
    return base - this.difficulty * (base - min);
  }

  /** Reset all spawn timers for a new game */
  public reset(): void {
    this.asteroidTimer = 0;
    this.enemyTimer = 0;
    this.powerUpTimer = 0;
    this.difficulty = 0;
  }
}
