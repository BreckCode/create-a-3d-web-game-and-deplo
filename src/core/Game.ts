import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { ProjectilePool } from '../entities/Projectile';
import { AsteroidPool } from '../entities/Asteroid';
import { EnemyPool } from '../entities/Enemy';
import { PowerUpPool } from '../entities/PowerUp';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Scene } from './Scene';
import { HUD } from '../ui/HUD';
import { MenuScreen } from '../ui/MenuScreen';
import { GameOverScreen } from '../ui/GameOverScreen';
import { POWERUP, COLORS } from '../utils/constants';

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
  public particleSystem: ParticleSystem;
  public scoreSystem: ScoreSystem;
  public hud: HUD;
  public menuScreen: MenuScreen;
  public gameOverScreen: GameOverScreen;

  // Power-up effect timers
  public shieldTimer = 0;
  public rapidFireTimer = 0;
  public state: GameState = GameState.MENU;
  public elapsed = 0;

  /** Convenience accessors so external code (HUD, menus) can read score/highScore */
  public get score(): number { return this.scoreSystem.score; }
  public get highScore(): number { return this.scoreSystem.highScore; }

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
    this.particleSystem = new ParticleSystem(this.scene.scene);
    this.collisionSystem = new CollisionSystem(this.player, this.projectiles, this.asteroids);
    this.collisionSystem.setEnemyPool(this.enemies);
    this.collisionSystem.setPowerUpPool(this.powerUps);
    this.scoreSystem = new ScoreSystem();
    this.collisionSystem.onAsteroidDestroyed = (scoreValue, position) => {
      this.scoreSystem.addKillScore(scoreValue);
      this.particleSystem.explosion(position, COLORS.ASTEROID_BASE);
    };
    this.collisionSystem.onEnemyDestroyed = (scoreValue, position) => {
      this.scoreSystem.addKillScore(scoreValue);
      this.particleSystem.explosion(position, COLORS.ENEMY_HULL, 40);
    };
    this.collisionSystem.onPowerUpCollected = (type, position) => {
      this.applyPowerUp(type);
      const colorMap: Record<string, number> = {
        SHIELD: COLORS.SHIELD,
        RAPID_FIRE: COLORS.RAPID_FIRE,
        HEALTH: COLORS.HEALTH,
      };
      this.particleSystem.pickup(position, colorMap[type] ?? 0xffffff);
    };
    this.collisionSystem.onPlayerHit = (position) => {
      this.particleSystem.explosion(position, COLORS.EXPLOSION, 15);
    };
    this.collisionSystem.onProjectileImpact = (position, color) => {
      this.particleSystem.impact(position, color);
    };
    this.hud = new HUD(this);
    this.menuScreen = new MenuScreen(this);
    this.gameOverScreen = new GameOverScreen(this);
  }

  /** Start the render loop (does NOT change game state). */
  public startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** Begin a new game session (MENU → PLAYING). */
  public start(): void {
    this.state = GameState.PLAYING;
    this.scoreSystem.reset();
    this.elapsed = 0;
    if (!this.running) this.startLoop();
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
    this.scoreSystem.finalizeScore();
  }

  public restart(): void {
    this.stop();
    this.player.reset();
    this.projectiles.reset();
    this.asteroids.reset();
    this.enemies.reset();
    this.powerUps.reset();
    this.spawnSystem.reset();
    this.particleSystem.reset();
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

    // Always update environment (starfield animation even when paused/menu)
    this.scene.update(delta);
    this.scene.render();
    this.hud.update();
    this.menuScreen.update();
    this.gameOverScreen.update();
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

    // Score system (combos, survival points, difficulty)
    this.scoreSystem.update(delta, this.elapsed);

    // Power-up effect timers
    this.updatePowerUpTimers(delta);

    // Collision detection
    this.collisionSystem.update();

    // Engine trails
    if (this.player.isAlive) {
      const enginePos = this.player.mesh.localToWorld(new THREE.Vector3(0, 0, 1.5));
      this.particleSystem.trail(enginePos, COLORS.PLAYER_ENGINE);
    }
    for (const e of this.enemies.getActive()) {
      const enginePos = e.mesh.localToWorld(new THREE.Vector3(0, 0, -1.3));
      this.particleSystem.trail(enginePos, COLORS.ENEMY_ACCENT);
    }

    // Particle system
    this.particleSystem.update(delta);

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

  public dispose(): void {
    this.stop();
    this.player.dispose();
    this.projectiles.dispose();
    this.asteroids.dispose();
    this.enemies.dispose();
    this.powerUps.dispose();
    this.particleSystem.dispose();
    this.hud.dispose();
    this.menuScreen.dispose();
    this.gameOverScreen.dispose();
    this.input.dispose();
    this.scene.dispose();
  }
}
