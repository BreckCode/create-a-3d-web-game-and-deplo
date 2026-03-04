import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CollisionSystem } from './CollisionSystem';

// Create minimal mock objects that satisfy the interfaces

function createMockPlayer(pos = { x: 0, y: 0, z: 0 }) {
  return {
    isAlive: true,
    position: new THREE.Vector3(pos.x, pos.y, pos.z),
    collisionRadius: 1.5,
    takeDamage: vi.fn(),
    mesh: new THREE.Object3D(),
  };
}

function createMockProjectile(opts: {
  active?: boolean;
  owner?: 'player' | 'enemy';
  pos?: { x: number; y: number; z: number };
  damage?: number;
} = {}) {
  return {
    active: opts.active ?? true,
    owner: opts.owner ?? 'player',
    position: new THREE.Vector3(opts.pos?.x ?? 0, opts.pos?.y ?? 0, opts.pos?.z ?? 0),
    collisionRadius: 0.3,
    damage: opts.damage ?? 25,
    deactivate: vi.fn(),
  };
}

function createMockAsteroid(opts: {
  active?: boolean;
  pos?: { x: number; y: number; z: number };
  health?: number;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
} = {}) {
  return {
    active: opts.active ?? true,
    position: new THREE.Vector3(opts.pos?.x ?? 0, opts.pos?.y ?? 0, opts.pos?.z ?? 0),
    collisionRadius: 2.0,
    health: opts.health ?? 50,
    size: opts.size ?? 'MEDIUM',
    scoreValue: 50,
    takeDamage: vi.fn((amount: number) => {
      // Return true if destroyed
      return amount >= (opts.health ?? 50);
    }),
    deactivate: vi.fn(),
  };
}

function createMockEnemy(opts: {
  active?: boolean;
  pos?: { x: number; y: number; z: number };
} = {}) {
  return {
    active: opts.active ?? true,
    position: new THREE.Vector3(opts.pos?.x ?? 0, opts.pos?.y ?? 0, opts.pos?.z ?? 0),
    collisionRadius: 1.5,
    health: 75,
    scoreValue: 200,
    takeDamage: vi.fn(() => true),
    deactivate: vi.fn(),
  };
}

function createMockPowerUp(opts: {
  active?: boolean;
  pos?: { x: number; y: number; z: number };
  type?: string;
} = {}) {
  return {
    active: opts.active ?? true,
    position: new THREE.Vector3(opts.pos?.x ?? 0, opts.pos?.y ?? 0, opts.pos?.z ?? 0),
    collisionRadius: 1.2,
    type: opts.type ?? 'SHIELD',
    collect: vi.fn(),
  };
}

describe('CollisionSystem', () => {
  let player: ReturnType<typeof createMockPlayer>;
  let projectilePool: { projectiles: ReturnType<typeof createMockProjectile>[]; getActive: () => any[]; markDirty: ReturnType<typeof vi.fn> };
  let asteroidPool: { asteroids: ReturnType<typeof createMockAsteroid>[]; getActive: () => any[]; markDirty: ReturnType<typeof vi.fn> };
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    player = createMockPlayer();
    projectilePool = {
      projectiles: [],
      getActive: function() { return this.projectiles.filter((p: any) => p.active); },
      markDirty: vi.fn(),
    };
    asteroidPool = {
      asteroids: [],
      getActive: function() { return this.asteroids.filter((a: any) => a.active); },
      markDirty: vi.fn(),
    };
    collisionSystem = new CollisionSystem(player as any, projectilePool as any, asteroidPool as any);
  });

  describe('projectile vs asteroid', () => {
    it('deactivates projectile and damages asteroid on collision', () => {
      const projectile = createMockProjectile({ pos: { x: 0, y: 0, z: 0 } });
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 } }); // within collision range
      projectilePool.projectiles.push(projectile);
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(projectile.deactivate).toHaveBeenCalled();
      expect(asteroid.takeDamage).toHaveBeenCalledWith(25);
    });

    it('fires onAsteroidDestroyed when asteroid health depleted', () => {
      const projectile = createMockProjectile({ pos: { x: 0, y: 0, z: 0 }, damage: 100 });
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 }, health: 50 });
      projectilePool.projectiles.push(projectile);
      asteroidPool.asteroids.push(asteroid);

      const onDestroyed = vi.fn();
      collisionSystem.onAsteroidDestroyed = onDestroyed;

      collisionSystem.update();

      expect(onDestroyed).toHaveBeenCalledWith(50, expect.any(THREE.Vector3));
    });

    it('does not detect collision when objects are far apart', () => {
      const projectile = createMockProjectile({ pos: { x: 0, y: 0, z: 0 } });
      const asteroid = createMockAsteroid({ pos: { x: 100, y: 0, z: 0 } });
      projectilePool.projectiles.push(projectile);
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(projectile.deactivate).not.toHaveBeenCalled();
      expect(asteroid.takeDamage).not.toHaveBeenCalled();
    });

    it('ignores inactive projectiles', () => {
      const projectile = createMockProjectile({ active: false, pos: { x: 0, y: 0, z: 0 } });
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 } });
      projectilePool.projectiles.push(projectile);
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(asteroid.takeDamage).not.toHaveBeenCalled();
    });

    it('ignores enemy-owned projectiles for asteroid collision', () => {
      const projectile = createMockProjectile({ owner: 'enemy', pos: { x: 0, y: 0, z: 0 } });
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 } });
      projectilePool.projectiles.push(projectile);
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(asteroid.takeDamage).not.toHaveBeenCalled();
    });
  });

  describe('player vs asteroid', () => {
    it('damages player on collision with asteroid', () => {
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 }, size: 'MEDIUM' });
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(player.takeDamage).toHaveBeenCalled();
      expect(asteroid.deactivate).toHaveBeenCalled();
    });

    it('fires onPlayerHit callback', () => {
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 } });
      asteroidPool.asteroids.push(asteroid);

      const onHit = vi.fn();
      collisionSystem.onPlayerHit = onHit;

      collisionSystem.update();

      expect(onHit).toHaveBeenCalledWith(expect.any(THREE.Vector3));
    });
  });

  describe('enemy projectile vs player', () => {
    it('damages player when hit by enemy projectile', () => {
      const projectile = createMockProjectile({ owner: 'enemy', pos: { x: 0, y: 0, z: 0 }, damage: 15 });
      projectilePool.projectiles.push(projectile);

      collisionSystem.update();

      expect(player.takeDamage).toHaveBeenCalledWith(15);
      expect(projectile.deactivate).toHaveBeenCalled();
    });
  });

  describe('player vs enemy', () => {
    it('damages player and deactivates enemy on collision', () => {
      const enemy = createMockEnemy({ pos: { x: 1, y: 0, z: 0 } });
      const enemyPool = {
        enemies: [enemy],
        getActive: () => [enemy],
        markDirty: vi.fn(),
      };
      collisionSystem.setEnemyPool(enemyPool);

      collisionSystem.update();

      expect(player.takeDamage).toHaveBeenCalled();
      expect(enemy.deactivate).toHaveBeenCalled();
    });
  });

  describe('projectile vs enemy', () => {
    it('damages enemy when hit by player projectile', () => {
      const projectile = createMockProjectile({ pos: { x: 0, y: 0, z: 0 } });
      const enemy = createMockEnemy({ pos: { x: 1, y: 0, z: 0 } });
      projectilePool.projectiles.push(projectile);

      const enemyPool = {
        enemies: [enemy],
        getActive: () => [enemy],
        markDirty: vi.fn(),
      };
      collisionSystem.setEnemyPool(enemyPool);

      const onEnemyDestroyed = vi.fn();
      collisionSystem.onEnemyDestroyed = onEnemyDestroyed;

      collisionSystem.update();

      expect(enemy.takeDamage).toHaveBeenCalledWith(25);
      expect(projectile.deactivate).toHaveBeenCalled();
      expect(onEnemyDestroyed).toHaveBeenCalledWith(200, expect.any(THREE.Vector3));
    });
  });

  describe('player vs power-up', () => {
    it('collects power-up when player overlaps', () => {
      const powerUp = createMockPowerUp({ pos: { x: 0, y: 0, z: 0 } });
      const powerUpPool = {
        powerUps: [powerUp],
        getActive: () => [powerUp],
        markDirty: vi.fn(),
      };
      collisionSystem.setPowerUpPool(powerUpPool);

      const onCollected = vi.fn();
      collisionSystem.onPowerUpCollected = onCollected;

      collisionSystem.update();

      expect(powerUp.collect).toHaveBeenCalled();
      expect(onCollected).toHaveBeenCalledWith('SHIELD', expect.any(THREE.Vector3));
    });
  });

  describe('dead player', () => {
    it('skips all collisions when player is dead', () => {
      player.isAlive = false;
      const asteroid = createMockAsteroid({ pos: { x: 1, y: 0, z: 0 } });
      asteroidPool.asteroids.push(asteroid);

      collisionSystem.update();

      expect(player.takeDamage).not.toHaveBeenCalled();
      expect(asteroid.takeDamage).not.toHaveBeenCalled();
    });
  });
});
