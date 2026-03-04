import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpawnSystem } from './SpawnSystem';
import { SPAWN, ENEMY } from '../utils/constants';

// Mock AsteroidPool
function createMockAsteroidPool() {
  return {
    spawn: vi.fn(),
    getActive: vi.fn(() => []),
    asteroids: [],
  };
}

// Mock generic spawnable pool
function createMockPool() {
  return {
    spawn: vi.fn(),
    getActive: vi.fn(() => []),
  };
}

describe('SpawnSystem', () => {
  let spawnSystem: SpawnSystem;
  let asteroidPool: ReturnType<typeof createMockAsteroidPool>;

  beforeEach(() => {
    asteroidPool = createMockAsteroidPool();
    spawnSystem = new SpawnSystem(asteroidPool as any);
  });

  describe('asteroid spawning', () => {
    it('spawns an asteroid on first update', () => {
      spawnSystem.update(0.1, 0.1);
      expect(asteroidPool.spawn).toHaveBeenCalled();
    });

    it('spawns asteroids with valid size keys', () => {
      spawnSystem.update(0.1, 0.1);
      const size = asteroidPool.spawn.mock.calls[0][0];
      expect(['SMALL', 'MEDIUM', 'LARGE']).toContain(size);
    });

    it('respects spawn interval', () => {
      spawnSystem.update(0.1, 0.1); // triggers first spawn, resets timer
      asteroidPool.spawn.mockClear();
      spawnSystem.update(0.1, 0.2); // only 0.1s later, should not spawn again
      expect(asteroidPool.spawn).not.toHaveBeenCalled();
    });

    it('spawns again after interval elapses', () => {
      spawnSystem.update(0.1, 0.1); // first spawn
      asteroidPool.spawn.mockClear();
      spawnSystem.update(SPAWN.ASTEROID_INTERVAL + 0.1, SPAWN.ASTEROID_INTERVAL + 0.2);
      expect(asteroidPool.spawn).toHaveBeenCalled();
    });
  });

  describe('enemy spawning', () => {
    it('does not spawn enemies without enemy pool', () => {
      spawnSystem.update(10, 60);
      // No error thrown
    });

    it('does not spawn enemies at low difficulty', () => {
      const enemyPool = createMockPool();
      spawnSystem.setEnemyPool(enemyPool);
      // difficulty < 0.1 means elapsed < 12s (120 * 0.1)
      spawnSystem.update(6, 6);
      expect(enemyPool.spawn).not.toHaveBeenCalled();
    });

    it('spawns enemies after difficulty threshold', () => {
      const enemyPool = createMockPool();
      spawnSystem.setEnemyPool(enemyPool);
      // elapsed = 20s → difficulty = 20/120 ≈ 0.167 > 0.1
      spawnSystem.update(20, 20);
      expect(enemyPool.spawn).toHaveBeenCalled();
    });
  });

  describe('power-up spawning', () => {
    it('does not spawn power-ups without pool', () => {
      spawnSystem.update(15, 15);
      // No error thrown
    });

    it('spawns power-ups when pool is set and interval elapses', () => {
      const puPool = createMockPool();
      spawnSystem.setPowerUpPool(puPool);
      // First update with timer at 0 should trigger spawn
      spawnSystem.update(0.1, 0.1);
      expect(puPool.spawn).toHaveBeenCalled();
    });
  });

  describe('difficulty scaling', () => {
    it('sets difficulty based on elapsed time', () => {
      spawnSystem.update(0.016, 60);
      expect(spawnSystem.difficulty).toBeCloseTo(60 / SPAWN.DIFFICULTY_RAMP_TIME);
    });

    it('caps difficulty at 1', () => {
      spawnSystem.update(0.016, 300);
      expect(spawnSystem.difficulty).toBe(1);
    });
  });

  describe('reset', () => {
    it('resets all timers and difficulty', () => {
      spawnSystem.update(0.016, 60);
      spawnSystem.reset();
      expect(spawnSystem.difficulty).toBe(0);
    });
  });
});
