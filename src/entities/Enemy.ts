import * as THREE from 'three';
import { ENEMY, COLORS, SPAWN } from '../utils/constants';
import { randomRange, randomSpawnPosition, clamp, damp } from '../utils/math';
import { ProjectilePool } from './Projectile';

export class Enemy {
  public mesh: THREE.Group;
  public active: boolean = false;
  public collisionRadius: number = ENEMY.SIZE;
  public health: number = ENEMY.MAX_HEALTH;
  public scoreValue: number = ENEMY.SCORE;

  private speed: number = 0;
  private strafeDirection: number = 1;
  private strafeTimer: number = 0;
  private fireCooldown: number = 0;
  private hullMaterial: THREE.MeshStandardMaterial;
  private engineMaterial: THREE.MeshStandardMaterial;
  private flashTimer: number = 0;

  // Reference to shared projectile pool for shooting
  private projectilePool: ProjectilePool | null = null;

  // Target position for AI (player position)
  private targetPosition = new THREE.Vector3();
  // Reusable vectors to avoid per-frame allocations
  private tmpDir = new THREE.Vector3();
  private tmpMuzzle = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.Group();

    this.hullMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.ENEMY_HULL,
      metalness: 0.6,
      roughness: 0.3,
    });

    this.engineMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.ENEMY_ACCENT,
      emissive: COLORS.ENEMY_ACCENT,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });

    this.buildShipModel();
    this.mesh.visible = false;
  }

  private buildShipModel(): void {
    // Main body — inverted cone (pointy front facing +Z toward player)
    const bodyGeo = new THREE.ConeGeometry(0.7, 2.5, 5);
    bodyGeo.rotateX(-Math.PI / 2); // point toward +Z
    const body = new THREE.Mesh(bodyGeo, this.hullMaterial);
    this.mesh.add(body);

    // Cockpit — dark angular shape
    const cockpitGeo = new THREE.SphereGeometry(0.3, 6, 4);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x440000,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x660000,
      emissiveIntensity: 0.5,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, 0.3);
    this.mesh.add(cockpit);

    // Wings — swept-back angular wings
    const wingGeo = new THREE.BoxGeometry(2.0, 0.06, 1.0);
    const wingMat = new THREE.MeshStandardMaterial({
      color: COLORS.ENEMY_ACCENT,
      metalness: 0.5,
      roughness: 0.4,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.0, 0, -0.3);
    leftWing.rotation.z = -0.15;
    leftWing.rotation.y = -0.2;
    this.mesh.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.0, 0, -0.3);
    rightWing.rotation.z = 0.15;
    rightWing.rotation.y = 0.2;
    this.mesh.add(rightWing);

    // Engine glow at rear
    const engineGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.4, 6);
    engineGeo.rotateX(Math.PI / 2);
    const engine = new THREE.Mesh(engineGeo, this.engineMaterial);
    engine.position.set(0, 0, -1.3);
    this.mesh.add(engine);
  }

  public setProjectilePool(pool: ProjectilePool): void {
    this.projectilePool = pool;
  }

  public activate(): void {
    this.health = ENEMY.MAX_HEALTH;
    this.scoreValue = ENEMY.SCORE;
    this.collisionRadius = ENEMY.SIZE;

    // Spawn at random position ahead of the player
    const pos = randomSpawnPosition(SPAWN.SPAWN_X_RANGE, SPAWN.SPAWN_Y_RANGE, ENEMY.SPAWN_Z);
    this.mesh.position.copy(pos);

    // Face toward the player (+Z direction)
    this.mesh.rotation.set(0, 0, 0);

    this.speed = ENEMY.SPEED + randomRange(-2, 2);
    this.strafeDirection = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = randomRange(1.0, 3.0);
    this.fireCooldown = randomRange(0.5, ENEMY.FIRE_RATE);
    this.flashTimer = 0;

    this.hullMaterial.emissive.setHex(0x000000);
    this.hullMaterial.emissiveIntensity = 0;

    this.active = true;
    this.mesh.visible = true;
  }

  public update(delta: number, playerPosition: THREE.Vector3): void {
    if (!this.active) return;

    this.targetPosition.copy(playerPosition);
    this.updateMovement(delta);
    this.updateShooting(delta);
    this.updateFlash(delta);

    // Despawn if past camera
    if (this.mesh.position.z > ENEMY.DESPAWN_Z) {
      this.deactivate();
    }
  }

  private updateMovement(delta: number): void {
    // Move toward player (positive Z)
    this.mesh.position.z += this.speed * delta;

    // Strafe horizontally
    this.strafeTimer -= delta;
    if (this.strafeTimer <= 0) {
      this.strafeDirection *= -1;
      this.strafeTimer = randomRange(1.5, 3.5);
    }

    this.mesh.position.x += this.strafeDirection * ENEMY.STRAFE_SPEED * delta;

    // Keep within bounds
    this.mesh.position.x = clamp(
      this.mesh.position.x,
      -SPAWN.SPAWN_X_RANGE,
      SPAWN.SPAWN_X_RANGE,
    );

    // Slight vertical tracking toward player Y
    const yDiff = this.targetPosition.y - this.mesh.position.y;
    this.mesh.position.y += clamp(yDiff, -1, 1) * ENEMY.STRAFE_SPEED * 0.3 * delta;

    // Tilt on strafe
    const targetTilt = -this.strafeDirection * 0.2;
    this.mesh.rotation.z = damp(this.mesh.rotation.z, targetTilt, 4, delta);

    // Engine glow pulse
    const pulse = Math.sin(performance.now() * 0.01) * 0.3;
    this.engineMaterial.emissiveIntensity = 0.8 + pulse;
  }

  private updateShooting(delta: number): void {
    if (!this.projectilePool) return;

    this.fireCooldown -= delta;
    if (this.fireCooldown > 0) return;

    // Only shoot when within aggro range of player
    const distToPlayer = this.mesh.position.distanceTo(this.targetPosition);
    if (distToPlayer > ENEMY.AGGRO_RANGE) return;

    this.fireCooldown = ENEMY.FIRE_RATE + randomRange(-0.3, 0.3);

    // Fire toward the player (reuse vectors to avoid allocations)
    this.tmpDir.subVectors(this.targetPosition, this.mesh.position).normalize();

    this.tmpMuzzle.copy(this.mesh.position).addScaledVector(this.tmpDir, 1.5);

    this.projectilePool.fire(this.tmpMuzzle, this.tmpDir, 'enemy');
  }

  private updateFlash(delta: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.hullMaterial.emissive.setHex(0x000000);
        this.hullMaterial.emissiveIntensity = 0;
      }
    }
  }

  public takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.deactivate();
      return true; // destroyed
    }
    // Flash white on hit
    this.hullMaterial.emissive.setHex(0xffffff);
    this.hullMaterial.emissiveIntensity = 0.6;
    this.flashTimer = 0.1;
    return false;
  }

  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
    this.hullMaterial.emissive.setHex(0x000000);
    this.hullMaterial.emissiveIntensity = 0;
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

/** Object pool for enemies */
export class EnemyPool {
  public enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private cachedActive: Enemy[] = [];
  private activeDirty = true;

  constructor(scene: THREE.Scene, projectilePool: ProjectilePool, poolSize: number = ENEMY.MAX_COUNT) {
    this.scene = scene;

    for (let i = 0; i < poolSize; i++) {
      const e = new Enemy();
      e.setProjectilePool(projectilePool);
      this.enemies.push(e);
      this.scene.add(e.mesh);
    }
  }

  /** Spawn a new enemy from the pool */
  public spawn(): Enemy | null {
    for (const e of this.enemies) {
      if (!e.active) {
        e.activate();
        this.activeDirty = true;
        return e;
      }
    }
    return null; // pool exhausted
  }

  /** Update all active enemies */
  public update(delta: number, playerPosition: THREE.Vector3): void {
    for (const e of this.enemies) {
      if (!e.active) continue;
      const wasBefore = e.active;
      e.update(delta, playerPosition);
      if (wasBefore && !e.active) this.activeDirty = true;
    }
  }

  /** Get all active enemies (cached — no allocation per frame) */
  public getActive(): Enemy[] {
    if (this.activeDirty) {
      this.cachedActive.length = 0;
      for (const e of this.enemies) {
        if (e.active) this.cachedActive.push(e);
      }
      this.activeDirty = false;
    }
    return this.cachedActive;
  }

  /** Mark cached active list as dirty (call when external code deactivates an enemy) */
  public markDirty(): void {
    this.activeDirty = true;
  }

  /** Deactivate all enemies */
  public reset(): void {
    for (const e of this.enemies) {
      e.deactivate();
    }
    this.activeDirty = true;
  }

  public dispose(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.mesh);
      e.dispose();
    }
    this.enemies.length = 0;
  }
}
