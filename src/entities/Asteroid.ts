import * as THREE from 'three';
import { ASTEROID, COLORS, SPAWN } from '../utils/constants';
import { randomRange, displaceVertex, randomSpawnPosition } from '../utils/math';

export type AsteroidSize = 'SMALL' | 'MEDIUM' | 'LARGE';

const ASTEROID_SIZES: AsteroidSize[] = ['SMALL', 'MEDIUM', 'LARGE'];

export class Asteroid {
  public mesh: THREE.Mesh;
  public active: boolean = false;
  public collisionRadius: number = 1;
  public health: number = 50;
  public scoreValue: number = 50;
  public size: AsteroidSize = 'MEDIUM';

  private speed: number = 0;
  private rotationAxis = new THREE.Vector3();
  private rotationSpeed: number = 0;
  private flashTimer: number = 0;

  private material: THREE.MeshStandardMaterial;

  constructor() {
    // Placeholder geometry — replaced on activate
    const geo = new THREE.IcosahedronGeometry(1, 1);
    this.material = new THREE.MeshStandardMaterial({
      color: COLORS.ASTEROID_BASE,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.visible = false;
  }

  /** Create a noisy icosahedron geometry for a given radius */
  private static createGeometry(radius: number): THREE.IcosahedronGeometry {
    const detail = radius > 2.5 ? 2 : 1;
    const geo = new THREE.IcosahedronGeometry(radius, detail);

    // Displace each vertex for a rocky look
    const pos = geo.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      vertex.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      displaceVertex(vertex, ASTEROID.NOISE_AMOUNT);
      pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }

  /** Activate this asteroid with a random size, position, and velocity */
  public activate(sizeKey?: AsteroidSize): void {
    this.size = sizeKey ?? ASTEROID_SIZES[Math.floor(Math.random() * ASTEROID_SIZES.length)];
    const sizeConfig = ASTEROID.SIZES[this.size];

    this.collisionRadius = sizeConfig.radius;
    this.health = sizeConfig.health;
    this.scoreValue = sizeConfig.score;

    // Replace geometry with a fresh noisy one
    this.mesh.geometry.dispose();
    this.mesh.geometry = Asteroid.createGeometry(sizeConfig.radius);

    // Tint variation: blend base and dark colors randomly
    const colorLerp = Math.random();
    const baseColor = new THREE.Color(COLORS.ASTEROID_BASE);
    const darkColor = new THREE.Color(COLORS.ASTEROID_DARK);
    this.material.color.copy(baseColor).lerp(darkColor, colorLerp);

    // Random spawn position
    const pos = randomSpawnPosition(SPAWN.SPAWN_X_RANGE, SPAWN.SPAWN_Y_RANGE, ASTEROID.SPAWN_Z);
    this.mesh.position.copy(pos);

    // Random rotation
    this.mesh.rotation.set(
      randomRange(0, Math.PI * 2),
      randomRange(0, Math.PI * 2),
      randomRange(0, Math.PI * 2),
    );

    // Speed toward camera (positive z)
    this.speed = randomRange(ASTEROID.SPEED_MIN, ASTEROID.SPEED_MAX);

    // Tumbling rotation
    this.rotationAxis.set(
      randomRange(-1, 1),
      randomRange(-1, 1),
      randomRange(-1, 1),
    ).normalize();
    this.rotationSpeed = randomRange(ASTEROID.ROTATION_SPEED_MIN, ASTEROID.ROTATION_SPEED_MAX);

    this.active = true;
    this.mesh.visible = true;
  }

  public update(delta: number): void {
    if (!this.active) return;

    // Move toward player (positive z direction)
    this.mesh.position.z += this.speed * delta;

    // Tumble
    this.mesh.rotateOnAxis(this.rotationAxis, this.rotationSpeed * delta);

    // Despawn if past camera
    if (this.mesh.position.z > ASTEROID.DESPAWN_Z) {
      this.deactivate();
    }

    // Flash timer (frame-based instead of setTimeout to avoid race conditions with pooling)
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.material.emissive.setHex(0x000000);
        this.material.emissiveIntensity = 0;
      }
    }
  }

  public takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.deactivate();
      return true; // destroyed
    }
    // Flash brighter on hit
    this.material.emissive.setHex(0xffffff);
    this.material.emissiveIntensity = 0.5;
    this.flashTimer = 0.08;
    return false;
  }

  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
    this.material.emissive.setHex(0x000000);
    this.material.emissiveIntensity = 0;
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** Object pool for asteroids */
export class AsteroidPool {
  public asteroids: Asteroid[] = [];
  private scene: THREE.Scene;
  private cachedActive: Asteroid[] = [];
  private activeDirty = true;

  constructor(scene: THREE.Scene, poolSize: number = ASTEROID.MAX_COUNT) {
    this.scene = scene;

    for (let i = 0; i < poolSize; i++) {
      const a = new Asteroid();
      this.asteroids.push(a);
      this.scene.add(a.mesh);
    }
  }

  /** Spawn a new asteroid from the pool */
  public spawn(sizeKey?: AsteroidSize): Asteroid | null {
    for (const a of this.asteroids) {
      if (!a.active) {
        a.activate(sizeKey);
        this.activeDirty = true;
        return a;
      }
    }
    return null; // pool exhausted
  }

  /** Update all active asteroids */
  public update(delta: number): void {
    for (const a of this.asteroids) {
      if (!a.active) continue;
      const wasBefore = a.active;
      a.update(delta);
      if (wasBefore && !a.active) this.activeDirty = true;
    }
  }

  /** Get all active asteroids (cached — no allocation per frame) */
  public getActive(): Asteroid[] {
    if (this.activeDirty) {
      this.cachedActive.length = 0;
      for (const a of this.asteroids) {
        if (a.active) this.cachedActive.push(a);
      }
      this.activeDirty = false;
    }
    return this.cachedActive;
  }

  /** Mark cached active list as dirty (call when external code deactivates an asteroid) */
  public markDirty(): void {
    this.activeDirty = true;
  }

  /** Deactivate all asteroids */
  public reset(): void {
    for (const a of this.asteroids) {
      a.deactivate();
    }
    this.activeDirty = true;
  }

  public dispose(): void {
    for (const a of this.asteroids) {
      this.scene.remove(a.mesh);
      a.dispose();
    }
    this.asteroids.length = 0;
  }
}
