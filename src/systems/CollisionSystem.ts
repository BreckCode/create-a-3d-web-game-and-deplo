import * as THREE from 'three';
import { Player } from '../entities/Player';
import { ProjectilePool } from '../entities/Projectile';
import { AsteroidPool } from '../entities/Asteroid';
import { spheresOverlap } from '../utils/math';
import { ASTEROID, PLAYER } from '../utils/constants';

/** Callback when an asteroid is destroyed by a projectile */
export type AsteroidDestroyedCallback = (scoreValue: number, position: THREE.Vector3) => void;

/** Callback when the player takes collision damage */
export type PlayerHitCallback = (position: THREE.Vector3) => void;

/** Callback when a projectile impacts (hit but not necessarily destroyed) */
export type ProjectileImpactCallback = (position: THREE.Vector3, color: number) => void;

/** Interface for enemy pool (registered later when enemies are implemented) */
interface EnemyLike {
  active: boolean;
  position: THREE.Vector3;
  collisionRadius: number;
  health: number;
  scoreValue: number;
  takeDamage(amount: number): boolean;
  deactivate(): void;
}

interface EnemyPoolLike {
  getActive(): EnemyLike[];
  enemies: EnemyLike[];
  markDirty(): void;
}

/** Interface for power-up pool (registered later when power-ups are implemented) */
interface PowerUpLike {
  active: boolean;
  position: THREE.Vector3;
  collisionRadius: number;
  type: string;
  collect(): void;
}

interface PowerUpPoolLike {
  getActive(): PowerUpLike[];
  powerUps: PowerUpLike[];
  markDirty(): void;
}

export type PowerUpCollectedCallback = (type: string, position: THREE.Vector3) => void;
export type EnemyDestroyedCallback = (scoreValue: number, position: THREE.Vector3) => void;

export class CollisionSystem {
  private player: Player;
  private projectiles: ProjectilePool;
  private asteroids: AsteroidPool;

  private enemyPool: EnemyPoolLike | null = null;
  private powerUpPool: PowerUpPoolLike | null = null;

  public onAsteroidDestroyed: AsteroidDestroyedCallback | null = null;
  public onEnemyDestroyed: EnemyDestroyedCallback | null = null;
  public onPlayerHit: PlayerHitCallback | null = null;
  public onPowerUpCollected: PowerUpCollectedCallback | null = null;
  public onProjectileImpact: ProjectileImpactCallback | null = null;

  constructor(player: Player, projectiles: ProjectilePool, asteroids: AsteroidPool) {
    this.player = player;
    this.projectiles = projectiles;
    this.asteroids = asteroids;
  }

  public setEnemyPool(pool: EnemyPoolLike): void {
    this.enemyPool = pool;
  }

  public setPowerUpPool(pool: PowerUpPoolLike): void {
    this.powerUpPool = pool;
  }

  public update(): void {
    if (!this.player.isAlive) return;

    this.checkProjectilesVsAsteroids();
    this.checkPlayerVsAsteroids();

    if (this.enemyPool) {
      this.checkProjectilesVsEnemies();
      this.checkPlayerVsEnemies();
      this.checkEnemyProjectilesVsPlayer();
    } else {
      // Even without enemy pool, check enemy projectiles hitting player
      this.checkEnemyProjectilesVsPlayer();
    }

    if (this.powerUpPool) {
      this.checkPlayerVsPowerUps();
    }
  }

  private checkProjectilesVsAsteroids(): void {
    const activeProjectiles = this.projectiles.projectiles;
    const activeAsteroids = this.asteroids.asteroids;

    for (const projectile of activeProjectiles) {
      if (!projectile.active || projectile.owner !== 'player') continue;

      for (const asteroid of activeAsteroids) {
        if (!asteroid.active) continue;

        if (spheresOverlap(
          projectile.position, projectile.collisionRadius,
          asteroid.position, asteroid.collisionRadius,
        )) {
          const hitPos = projectile.position.clone();
          const destroyed = asteroid.takeDamage(projectile.damage);
          projectile.deactivate();
          this.projectiles.markDirty();
          if (destroyed) this.asteroids.markDirty();

          if (this.onProjectileImpact) {
            this.onProjectileImpact(hitPos, 0x00ffaa);
          }
          if (destroyed && this.onAsteroidDestroyed) {
            this.onAsteroidDestroyed(asteroid.scoreValue, asteroid.position.clone());
          }
          break; // projectile can only hit one asteroid
        }
      }
    }
  }

  private checkPlayerVsAsteroids(): void {
    const activeAsteroids = this.asteroids.asteroids;

    for (const asteroid of activeAsteroids) {
      if (!asteroid.active) continue;

      if (spheresOverlap(
        this.player.position, this.player.collisionRadius,
        asteroid.position, asteroid.collisionRadius,
      )) {
        // Damage based on asteroid size
        const damage = ASTEROID.SIZES[asteroid.size].health;
        const collisionPos = asteroid.position.clone();
        this.player.takeDamage(damage);
        asteroid.deactivate();
        this.asteroids.markDirty();

        if (this.onPlayerHit) {
          this.onPlayerHit(collisionPos);
        }
        break; // only one asteroid collision per frame
      }
    }
  }

  private checkProjectilesVsEnemies(): void {
    if (!this.enemyPool) return;

    const activeProjectiles = this.projectiles.projectiles;
    const enemies = this.enemyPool.enemies;

    for (const projectile of activeProjectiles) {
      if (!projectile.active || projectile.owner !== 'player') continue;

      for (const enemy of enemies) {
        if (!enemy.active) continue;

        if (spheresOverlap(
          projectile.position, projectile.collisionRadius,
          enemy.position, enemy.collisionRadius,
        )) {
          const hitPos = projectile.position.clone();
          const destroyed = enemy.takeDamage(projectile.damage);
          projectile.deactivate();
          this.projectiles.markDirty();
          if (destroyed) this.enemyPool!.markDirty();

          if (this.onProjectileImpact) {
            this.onProjectileImpact(hitPos, 0x00ffaa);
          }
          if (destroyed && this.onEnemyDestroyed) {
            this.onEnemyDestroyed(enemy.scoreValue, enemy.position.clone());
          }
          break;
        }
      }
    }
  }

  private checkPlayerVsEnemies(): void {
    if (!this.enemyPool) return;

    const enemies = this.enemyPool.enemies;

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      if (spheresOverlap(
        this.player.position, this.player.collisionRadius,
        enemy.position, enemy.collisionRadius,
      )) {
        const collisionPos = enemy.position.clone();
        this.player.takeDamage(PLAYER.MAX_HEALTH * 0.3);
        enemy.deactivate();
        this.enemyPool!.markDirty();

        if (this.onPlayerHit) {
          this.onPlayerHit(collisionPos);
        }
        break;
      }
    }
  }

  private checkEnemyProjectilesVsPlayer(): void {
    const activeProjectiles = this.projectiles.projectiles;

    for (const projectile of activeProjectiles) {
      if (!projectile.active || projectile.owner !== 'enemy') continue;

      if (spheresOverlap(
        projectile.position, projectile.collisionRadius,
        this.player.position, this.player.collisionRadius,
      )) {
        const hitPos = projectile.position.clone();
        this.player.takeDamage(projectile.damage);
        projectile.deactivate();
        this.projectiles.markDirty();

        if (this.onProjectileImpact) {
          this.onProjectileImpact(hitPos, 0xff4444);
        }
        if (this.onPlayerHit) {
          this.onPlayerHit(hitPos);
        }
      }
    }
  }

  private checkPlayerVsPowerUps(): void {
    if (!this.powerUpPool) return;

    const powerUps = this.powerUpPool.powerUps;

    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;

      if (spheresOverlap(
        this.player.position, this.player.collisionRadius,
        powerUp.position, powerUp.collisionRadius,
      )) {
        powerUp.collect();
        this.powerUpPool!.markDirty();

        if (this.onPowerUpCollected) {
          this.onPowerUpCollected(powerUp.type, powerUp.position.clone());
        }
      }
    }
  }
}
