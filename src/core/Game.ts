import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { ProjectilePool } from '../entities/Projectile';
import { AsteroidPool } from '../entities/Asteroid';
import { EnemyPool } from '../entities/Enemy';
import { PowerUpPool } from '../entities/PowerUp';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { Scene } from './Scene';
import { POWERUP } from '../utils/constants';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
}

export class Game {
  public scene: Scene;
  public input: InputManager;
  public player: Player;
  public projectiles: ProjectilePool;
  public asteroids: AsteroidPool;
  public enemies: EnemyPool;
  public powerUps: PowerUpPool;
  public spawnSystem: SpawnSystem;
  public collisionSystem: CollisionSystem;

  // Power-up effect timers
  private shieldTimer = 0;
  private rapidFireTimer = 0;
  public state: GameState = GameState.MENU;
  public score = 0;
  public highScore = 0;
  public elapsed = 0;

  private lastTime = 0;
  private animationFrameId = 0;
  private running = false;

  constructor(container: HTMLElement) {
    this.scene = new Scene(container);
    this.input = new InputManager(this.scene.renderer.domElement);
    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.projectiles = new ProjectilePool(this.scene.scene);
    this.asteroids = new AsteroidPool(this.scene.scene);
    this.enemies = new EnemyPool(this.scene.scene, this.projectiles);
    this.powerUps = new PowerUpPool(this.scene.scene);
    this.spawnSystem = new SpawnSystem(this.asteroids);
    this.spawnSystem.setEnemyPool(this.enemies);
    this.spawnSystem.setPowerUpPool(this.powerUps);
    this.collisionSystem = new CollisionSystem(this.player, this.projectiles, this.asteroids);
    this.collisionSystem.setEnemyPool(this.enemies);
    this.collisionSystem.setPowerUpPool(this.powerUps);
    this.collisionSystem.onAsteroidDestroyed = (scoreValue) => {
      this.score += scoreValue;
    };
    this.collisionSystem.onEnemyDestroyed = (scoreValue) => {
      this.score += scoreValue;
    };
    this.collisionSystem.onPowerUpCollected = (type) => {
      this.applyPowerUp(type);
    };
    this.highScore = this.loadHighScore();
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.state = GameState.PLAYING;
    this.score = 0;
    this.elapsed = 0;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public pause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
    }
  }

  public resume(): void {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.lastTime = performance.now();
    }
  }

  public gameOver(): void {
    this.state = GameState.GAME_OVER;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.highScore);
    }
  }

  public restart(): void {
    this.stop();
    this.player.reset();
    this.projectiles.reset();
    this.asteroids.reset();
    this.enemies.reset();
    this.powerUps.reset();
    this.spawnSystem.reset();
    this.shieldTimer = 0;
    this.rapidFireTimer = 0;
    this.start();
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min((time - this.lastTime) / 1000, 0.05); // cap at 50ms to avoid spiral
    this.lastTime = time;

    if (this.state === GameState.PLAYING) {
      this.elapsed += delta;
      this.update(delta);
    }

    this.scene.render();
    this.input.update();
  };

  private update(delta: number): void {
    this.player.update(delta, this.input);

    // Player shooting
    if (this.input.shoot && this.player.canShoot()) {
      this.player.shoot();
      this.projectiles.fire(
        this.player.getMuzzlePosition(),
        this.player.getForwardDirection(),
        'player',
      );
    }

    this.projectiles.update(delta);

    // Spawn system handles asteroids, enemies, and power-ups
    this.spawnSystem.update(delta, this.elapsed);

    this.asteroids.update(delta);
    this.enemies.update(delta, this.player.position);
    this.powerUps.update(delta);

    // Power-up effect timers
    this.updatePowerUpTimers(delta);

    // Collision detection
    this.collisionSystem.update();

    if (!this.player.isAlive) {
      this.gameOver();
    }
  }

  private applyPowerUp(type: string): void {
    switch (type) {
      case 'SHIELD':
        this.player.hasShield = true;
        this.shieldTimer = POWERUP.TYPES.SHIELD.duration;
        break;
      case 'RAPID_FIRE':
        this.player.hasRapidFire = true;
        this.rapidFireTimer = POWERUP.TYPES.RAPID_FIRE.duration;
        break;
      case 'HEALTH':
        this.player.heal(POWERUP.TYPES.HEALTH.amount);
        break;
    }
  }

  private updatePowerUpTimers(delta: number): void {
    if (this.shieldTimer > 0) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.player.hasShield = false;
        this.shieldTimer = 0;
      }
    }
    if (this.rapidFireTimer > 0) {
      this.rapidFireTimer -= delta;
      if (this.rapidFireTimer <= 0) {
        this.player.hasRapidFire = false;
        this.rapidFireTimer = 0;
      }
    }
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('space-survival-highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number): void {
    try {
      localStorage.setItem('space-survival-highscore', String(score));
    } catch {
      // localStorage unavailable
    }
  }

  public dispose(): void {
    this.stop();
    this.player.dispose();
    this.projectiles.dispose();
    this.asteroids.dispose();
    this.enemies.dispose();
    this.powerUps.dispose();
    this.input.dispose();
    this.scene.dispose();
  }
}
