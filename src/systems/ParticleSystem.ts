import * as THREE from 'three';
import { PARTICLES, COLORS } from '../utils/constants';
import { randomRange, randomDirection } from '../utils/math';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;

  // Typed arrays for GPU upload
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private activeCount = 0;

  // Free list for O(1) particle acquisition
  private freeIndices: number[] = [];

  // Reusable temporaries to avoid per-call allocations
  private static tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const max = PARTICLES.MAX_PARTICLES;

    // Pre-allocate particle objects
    for (let i = 0; i < max; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        size: 1,
        color: new THREE.Color(1, 1, 1),
        active: false,
      });
      this.freeIndices.push(i);
    }

    // Allocate typed arrays
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Acquire a free particle from the pool using the free list (O(1) amortized) */
  private acquire(): Particle | null {
    if (this.freeIndices.length === 0) return null;
    const idx = this.freeIndices.pop()!;
    return this.particles[idx];
  }

  /** Spawn an explosion burst at a position */
  public explosion(position: THREE.Vector3, color: number = COLORS.EXPLOSION, count?: number): void {
    const n = count ?? PARTICLES.EXPLOSION_COUNT;
    ParticleSystem.tmpColor.setHex(color);

    for (let i = 0; i < n; i++) {
      const p = this.acquire();
      if (!p) break;

      p.active = true;
      p.position.copy(position);

      const dir = randomDirection();
      const speed = randomRange(PARTICLES.EXPLOSION_SPEED * 0.3, PARTICLES.EXPLOSION_SPEED);
      p.velocity.copy(dir).multiplyScalar(speed);

      p.maxLife = randomRange(PARTICLES.EXPLOSION_LIFETIME * 0.5, PARTICLES.EXPLOSION_LIFETIME);
      p.life = p.maxLife;
      p.size = randomRange(0.3, 1.0);

      // Slight color variation
      p.color.copy(ParticleSystem.tmpColor);
      p.color.r += randomRange(-0.1, 0.1);
      p.color.g += randomRange(-0.1, 0.1);
      p.color.b += randomRange(-0.05, 0.05);
    }
  }

  /** Spawn impact particles (smaller burst for projectile hits) */
  public impact(position: THREE.Vector3, color: number = COLORS.EXPLOSION): void {
    ParticleSystem.tmpColor.setHex(color);

    for (let i = 0; i < PARTICLES.IMPACT_COUNT; i++) {
      const p = this.acquire();
      if (!p) break;

      p.active = true;
      p.position.copy(position);

      const dir = randomDirection();
      const speed = randomRange(PARTICLES.IMPACT_SPEED * 0.4, PARTICLES.IMPACT_SPEED);
      p.velocity.copy(dir).multiplyScalar(speed);

      p.maxLife = randomRange(PARTICLES.IMPACT_LIFETIME * 0.5, PARTICLES.IMPACT_LIFETIME);
      p.life = p.maxLife;
      p.size = randomRange(0.15, 0.5);
      p.color.copy(ParticleSystem.tmpColor);
    }
  }

  /** Spawn engine trail particles behind a moving object */
  public trail(position: THREE.Vector3, color: number = COLORS.PLAYER_ENGINE): void {
    ParticleSystem.tmpColor.setHex(color);

    for (let i = 0; i < PARTICLES.TRAIL_COUNT; i++) {
      const p = this.acquire();
      if (!p) break;

      p.active = true;
      p.position.copy(position);
      // Small random offset
      p.position.x += randomRange(-0.2, 0.2);
      p.position.y += randomRange(-0.2, 0.2);

      // Trail particles drift backward and outward slightly
      p.velocity.set(
        randomRange(-1, 1),
        randomRange(-1, 1),
        randomRange(2, 5),
      );

      p.maxLife = randomRange(PARTICLES.TRAIL_LIFETIME * 0.5, PARTICLES.TRAIL_LIFETIME);
      p.life = p.maxLife;
      p.size = randomRange(0.15, 0.4);
      p.color.copy(ParticleSystem.tmpColor);
    }
  }

  /** Spawn a ring of particles for power-up collection */
  public pickup(position: THREE.Vector3, color: number): void {
    ParticleSystem.tmpColor.setHex(color);

    for (let i = 0; i < PARTICLES.PICKUP_COUNT; i++) {
      const p = this.acquire();
      if (!p) break;

      p.active = true;
      p.position.copy(position);

      // Radial burst
      const angle = (i / PARTICLES.PICKUP_COUNT) * Math.PI * 2;
      const speed = randomRange(PARTICLES.PICKUP_SPEED * 0.5, PARTICLES.PICKUP_SPEED);
      p.velocity.set(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed * 0.5 + randomRange(-2, 2),
        randomRange(-2, 2),
      );

      p.maxLife = randomRange(PARTICLES.PICKUP_LIFETIME * 0.5, PARTICLES.PICKUP_LIFETIME);
      p.life = p.maxLife;
      p.size = randomRange(0.2, 0.6);
      p.color.copy(ParticleSystem.tmpColor);
    }
  }

  /** Update all active particles, upload to GPU */
  public update(delta: number): void {
    this.activeCount = 0;

    for (let idx = 0; idx < this.particles.length; idx++) {
      const p = this.particles[idx];
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        this.freeIndices.push(idx);
        continue;
      }

      // Move
      p.position.addScaledVector(p.velocity, delta);

      // Drag / slow down over time
      p.velocity.multiplyScalar(1 - delta * 2);

      // Write into buffers
      const i3 = this.activeCount * 3;
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      // Fade color with life
      const t = p.life / p.maxLife;
      this.colors[i3] = p.color.r * t;
      this.colors[i3 + 1] = p.color.g * t;
      this.colors[i3 + 2] = p.color.b * t;

      // Shrink with life
      this.sizes[this.activeCount] = p.size * t;

      this.activeCount++;
    }

    // Update draw range and flag for upload
    this.geometry.setDrawRange(0, this.activeCount);

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;

    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
  }

  /** Deactivate all particles and rebuild free list */
  public reset(): void {
    this.freeIndices.length = 0;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.freeIndices.push(i);
    }
    this.activeCount = 0;
    this.geometry.setDrawRange(0, 0);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
