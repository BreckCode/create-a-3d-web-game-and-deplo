import * as THREE from 'three';
import { PROJECTILE, COLORS } from '../utils/constants';

export type ProjectileOwner = 'player' | 'enemy';

// Shared geometry and materials across all projectile instances to reduce GPU memory
const sharedGeometry = new THREE.SphereGeometry(PROJECTILE.SIZE, 6, 4);
const sharedPlayerMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.PROJECTILE_PLAYER,
  emissive: COLORS.PROJECTILE_PLAYER,
  emissiveIntensity: 2.0,
  transparent: true,
  opacity: 0.9,
});
const sharedEnemyMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.PROJECTILE_ENEMY,
  emissive: COLORS.PROJECTILE_ENEMY,
  emissiveIntensity: 2.0,
  transparent: true,
  opacity: 0.9,
});

export class Projectile {
  public mesh: THREE.Mesh;
  public active: boolean = false;
  public owner: ProjectileOwner = 'player';
  public collisionRadius: number = PROJECTILE.SIZE;
  public damage: number = PROJECTILE.DAMAGE;

  private velocity = new THREE.Vector3();
  private lifetime: number = 0;

  constructor() {
    this.mesh = new THREE.Mesh(sharedGeometry, sharedPlayerMaterial);
    this.mesh.visible = false;
  }

  public fire(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    owner: ProjectileOwner,
  ): void {
    this.active = true;
    this.owner = owner;
    this.lifetime = PROJECTILE.LIFETIME;

    const speed = owner === 'player' ? PROJECTILE.SPEED : PROJECTILE.ENEMY_SPEED;
    this.damage = owner === 'player' ? PROJECTILE.DAMAGE : PROJECTILE.ENEMY_DAMAGE;
    this.velocity.copy(direction).normalize().multiplyScalar(speed);

    this.mesh.position.copy(position);
    this.mesh.material = owner === 'player' ? sharedPlayerMaterial : sharedEnemyMaterial;
    this.mesh.visible = true;
  }

  public update(delta: number): void {
    if (!this.active) return;

    this.mesh.position.addScaledVector(this.velocity, delta);
    this.lifetime -= delta;

    if (this.lifetime <= 0) {
      this.deactivate();
    }
  }

  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    // Geometry and materials are shared — disposed by the pool
  }
}

/** Object pool for projectiles */
export class ProjectilePool {
  public projectiles: Projectile[] = [];
  private scene: THREE.Scene;
  // Cached active list to avoid per-frame allocations
  private cachedActive: Projectile[] = [];
  private activeDirty = true;

  constructor(scene: THREE.Scene, poolSize: number = PROJECTILE.POOL_SIZE) {
    this.scene = scene;

    for (let i = 0; i < poolSize; i++) {
      const p = new Projectile();
      this.projectiles.push(p);
      this.scene.add(p.mesh);
    }
  }

  /** Get an inactive projectile from the pool, or null if pool is exhausted */
  public acquire(): Projectile | null {
    for (const p of this.projectiles) {
      if (!p.active) return p;
    }
    return null;
  }

  /** Fire a projectile from the pool */
  public fire(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    owner: ProjectileOwner,
  ): Projectile | null {
    const p = this.acquire();
    if (p) {
      p.fire(position, direction, owner);
      this.activeDirty = true;
    }
    return p;
  }

  /** Update all active projectiles */
  public update(delta: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      const wasBefore = p.active;
      p.update(delta);
      if (wasBefore && !p.active) this.activeDirty = true;
    }
  }

  /** Deactivate all projectiles */
  public reset(): void {
    for (const p of this.projectiles) {
      p.deactivate();
    }
    this.activeDirty = true;
  }

  /** Get all active projectiles (cached — no allocation per frame) */
  public getActive(): Projectile[] {
    if (this.activeDirty) {
      this.cachedActive.length = 0;
      for (const p of this.projectiles) {
        if (p.active) this.cachedActive.push(p);
      }
      this.activeDirty = false;
    }
    return this.cachedActive;
  }

  public dispose(): void {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles.length = 0;
    // Dispose shared resources
    sharedGeometry.dispose();
    sharedPlayerMaterial.dispose();
    sharedEnemyMaterial.dispose();
  }
}
