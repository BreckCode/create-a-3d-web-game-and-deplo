import * as THREE from 'three';
import { POWERUP, COLORS, SPAWN } from '../utils/constants';
import { randomRange, randomSpawnPosition } from '../utils/math';

export type PowerUpType = 'SHIELD' | 'RAPID_FIRE' | 'HEALTH';

const POWERUP_TYPES: PowerUpType[] = ['SHIELD', 'RAPID_FIRE', 'HEALTH'];

export class PowerUp {
  public mesh: THREE.Group;
  public active: boolean = false;
  public collisionRadius: number = POWERUP.SIZE;
  public type: PowerUpType = 'HEALTH';

  private speed: number = POWERUP.SPEED;
  private bobOffset: number = 0;
  private baseY: number = 0;
  private innerMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private glowMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.mesh = new THREE.Group();

    this.material = new THREE.MeshStandardMaterial({
      color: COLORS.HEALTH,
      metalness: 0.8,
      roughness: 0.2,
      emissive: COLORS.HEALTH,
      emissiveIntensity: 0.6,
    });

    this.glowMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.HEALTH,
      emissive: COLORS.HEALTH,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.3,
    });

    // Inner shape — will be replaced on activate based on type
    const innerGeo = new THREE.OctahedronGeometry(0.6, 0);
    this.innerMesh = new THREE.Mesh(innerGeo, this.material);
    this.mesh.add(this.innerMesh);

    // Outer glow sphere
    const glowGeo = new THREE.SphereGeometry(POWERUP.SIZE, 12, 8);
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.mesh.add(this.glowMesh);

    this.mesh.visible = false;
  }

  public activate(typeKey?: PowerUpType): void {
    this.type = typeKey ?? POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];

    // Set colors based on type
    let color: number;
    switch (this.type) {
      case 'SHIELD':
        color = POWERUP.TYPES.SHIELD.color;
        break;
      case 'RAPID_FIRE':
        color = POWERUP.TYPES.RAPID_FIRE.color;
        break;
      case 'HEALTH':
        color = POWERUP.TYPES.HEALTH.color;
        break;
    }

    this.material.color.setHex(color);
    this.material.emissive.setHex(color);
    this.glowMaterial.color.setHex(color);
    this.glowMaterial.emissive.setHex(color);

    // Swap inner geometry based on type
    this.innerMesh.geometry.dispose();
    switch (this.type) {
      case 'SHIELD':
        // Diamond/octahedron for shield
        this.innerMesh.geometry = new THREE.OctahedronGeometry(0.6, 0);
        break;
      case 'RAPID_FIRE':
        // Tetrahedron for rapid fire
        this.innerMesh.geometry = new THREE.TetrahedronGeometry(0.7, 0);
        break;
      case 'HEALTH':
        // Icosahedron (rounder) for health
        this.innerMesh.geometry = new THREE.IcosahedronGeometry(0.5, 0);
        break;
    }

    // Random spawn position
    const pos = randomSpawnPosition(SPAWN.SPAWN_X_RANGE, SPAWN.SPAWN_Y_RANGE, POWERUP.SPAWN_Z);
    this.mesh.position.copy(pos);
    this.baseY = pos.y;

    this.speed = POWERUP.SPEED;
    this.bobOffset = randomRange(0, Math.PI * 2);

    this.active = true;
    this.mesh.visible = true;
  }

  public update(delta: number): void {
    if (!this.active) return;

    // Move toward player (positive z)
    this.mesh.position.z += this.speed * delta;

    // Bobbing motion
    this.bobOffset += POWERUP.BOB_SPEED * delta;
    this.mesh.position.y = this.baseY + Math.sin(this.bobOffset) * POWERUP.BOB_AMPLITUDE;

    // Rotate inner mesh
    this.innerMesh.rotation.y += POWERUP.ROTATION_SPEED * delta;
    this.innerMesh.rotation.x += POWERUP.ROTATION_SPEED * 0.5 * delta;

    // Pulse glow
    const pulse = Math.sin(this.bobOffset * 2) * 0.15;
    this.glowMaterial.opacity = 0.25 + pulse;
    this.material.emissiveIntensity = 0.5 + pulse;

    // Despawn if past camera
    if (this.mesh.position.z > POWERUP.DESPAWN_Z) {
      this.deactivate();
    }
  }

  public collect(): void {
    this.deactivate();
  }

  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    this.innerMesh.geometry.dispose();
    this.glowMesh.geometry.dispose();
    this.material.dispose();
    this.glowMaterial.dispose();
  }
}

/** Max number of power-ups in the pool */
const POOL_SIZE = 8;

/** Object pool for power-ups */
export class PowerUpPool {
  public powerUps: PowerUp[] = [];
  private scene: THREE.Scene;
  private cachedActive: PowerUp[] = [];
  private activeDirty = true;

  constructor(scene: THREE.Scene, poolSize: number = POOL_SIZE) {
    this.scene = scene;

    for (let i = 0; i < poolSize; i++) {
      const p = new PowerUp();
      this.powerUps.push(p);
      this.scene.add(p.mesh);
    }
  }

  /** Spawn a new power-up from the pool */
  public spawn(typeKey?: PowerUpType): PowerUp | null {
    for (const p of this.powerUps) {
      if (!p.active) {
        p.activate(typeKey);
        this.activeDirty = true;
        return p;
      }
    }
    return null; // pool exhausted
  }

  /** Update all active power-ups */
  public update(delta: number): void {
    for (const p of this.powerUps) {
      if (!p.active) continue;
      const wasBefore = p.active;
      p.update(delta);
      if (wasBefore && !p.active) this.activeDirty = true;
    }
  }

  /** Get all active power-ups (cached — no allocation per frame) */
  public getActive(): PowerUp[] {
    if (this.activeDirty) {
      this.cachedActive.length = 0;
      for (const p of this.powerUps) {
        if (p.active) this.cachedActive.push(p);
      }
      this.activeDirty = false;
    }
    return this.cachedActive;
  }

  /** Mark cached active list as dirty */
  public markDirty(): void {
    this.activeDirty = true;
  }

  /** Deactivate all power-ups */
  public reset(): void {
    for (const p of this.powerUps) {
      p.deactivate();
    }
    this.activeDirty = true;
  }

  public dispose(): void {
    for (const p of this.powerUps) {
      this.scene.remove(p.mesh);
      p.dispose();
    }
    this.powerUps.length = 0;
  }
}
