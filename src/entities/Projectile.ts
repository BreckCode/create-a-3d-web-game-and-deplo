import * as THREE from 'three';
import { PROJECTILE, COLORS } from '../utils/constants';

export type ProjectileOwner = 'player' | 'enemy';

export class Projectile {
  public mesh: THREE.Mesh;
  public active: boolean = false;
  public owner: ProjectileOwner = 'player';
  public collisionRadius: number = PROJECTILE.SIZE;
  public damage: number = PROJECTILE.DAMAGE;

  private velocity = new THREE.Vector3();
  private lifetime: number = 0;

  private playerMaterial: THREE.MeshStandardMaterial;
  private enemyMaterial: THREE.MeshStandardMaterial;

  constructor() {
    const geo = new THREE.SphereGeometry(PROJECTILE.SIZE, 6, 4);

    this.playerMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.PROJECTILE_PLAYER,
      emissive: COLORS.PROJECTILE_PLAYER,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9,
    });

    this.enemyMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.PROJECTILE_ENEMY,
      emissive: COLORS.PROJECTILE_ENEMY,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.Mesh(geo, this.playerMaterial);
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
    this.mesh.material = owner === 'player' ? this.playerMaterial : this.enemyMaterial;
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
    this.mesh.geometry.dispose();
    this.playerMaterial.dispose();
    this.enemyMaterial.dispose();
  }
}

/** Object pool for projectiles */
export class ProjectilePool {
  public projectiles: Projectile[] = [];
  private scene: THREE.Scene;

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
    }
    return p;
  }

  /** Update all active projectiles */
  public update(delta: number): void {
    for (const p of this.projectiles) {
      p.update(delta);
    }
  }

  /** Deactivate all projectiles */
  public reset(): void {
    for (const p of this.projectiles) {
      p.deactivate();
    }
  }

  /** Get all active projectiles */
  public getActive(): Projectile[] {
    return this.projectiles.filter((p) => p.active);
  }

  public dispose(): void {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.dispose();
    }
    this.projectiles.length = 0;
  }
}
