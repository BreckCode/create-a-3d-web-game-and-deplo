import * as THREE from 'three';
import { Player } from '../entities/Player';
import { ProjectilePool } from '../entities/Projectile';
import { AsteroidPool } from '../entities/Asteroid';
import { spheresOverlap } from '../utils/math';
import { ASTEROID, PLAYER } from '../utils/constants';

/** Callback when an asteroid is destroyed by a projectile */
export type AsteroidDestroyedCallback = (scoreValue: number) => void;

/** Callback when the player takes collision damage */
export type PlayerHitCallback = () => void;

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
}

export type PowerUpCollectedCallback = (type: string) => void;
export type EnemyDestroyedCallback = (scoreValue: number) => void;

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
          const destroyed = asteroid.takeDamage(projectile.damage);
          projectile.deactivate();

          if (destroyed && this.onAsteroidDestroyed) {
            this.onAsteroidDestroyed(asteroid.scoreValue);
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
        this.player.takeDamage(damage);
        asteroid.deactivate();

        if (this.onPlayerHit) {
          this.onPlayerHit();
        }
        break; // only one asteroid collision per frame
      }
    }
  }

  private checkProjectilesVsEnemies(): void {
    if (!this.enemyPool) return;

    const activeProjectiles = this.projectiles.projectiles;
    const activeEnemies = this.enemyPool.getActive();

    for (const projectile of activeProjectiles) {
      if (!projectile.active || projectile.owner !== 'player') continue;

      for (const enemy of activeEnemies) {
        if (!enemy.active) continue;

        if (spheresOverlap(
          projectile.position, projectile.collisionRadius,
          enemy.position, enemy.collisionRadius,
        )) {
          const destroyed = enemy.takeDamage(projectile.damage);
          projectile.deactivate();

          if (destroyed && this.onEnemyDestroyed) {
            this.onEnemyDestroyed(enemy.scoreValue);
          }
          break;
        }
      }
    }
  }

  private checkPlayerVsEnemies(): void {
    if (!this.enemyPool) return;

    const activeEnemies = this.enemyPool.getActive();

    for (const enemy of activeEnemies) {
      if (!enemy.active) continue;

      if (spheresOverlap(
        this.player.position, this.player.collisionRadius,
        enemy.position, enemy.collisionRadius,
      )) {
        this.player.takeDamage(PLAYER.MAX_HEALTH * 0.3);
        enemy.deactivate();

        if (this.onPlayerHit) {
          this.onPlayerHit();
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
        this.player.takeDamage(projectile.damage);
        projectile.deactivate();

        if (this.onPlayerHit) {
          this.onPlayerHit();
        }
      }
    }
  }

  private checkPlayerVsPowerUps(): void {
    if (!this.powerUpPool) return;

    const activePowerUps = this.powerUpPool.getActive();

    for (const powerUp of activePowerUps) {
      if (!powerUp.active) continue;

      if (spheresOverlap(
        this.player.position, this.player.collisionRadius,
        powerUp.position, powerUp.collisionRadius,
      )) {
        powerUp.collect();

        if (this.onPowerUpCollected) {
          this.onPowerUpCollected(powerUp.type);
        }
      }
    }
  }
}
