import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { PLAYER, COLORS } from '../utils/constants';
import { clamp, damp } from '../utils/math';

export class Player {
  public mesh: THREE.Group;
  public health: number = PLAYER.MAX_HEALTH;
  public maxHealth: number = PLAYER.MAX_HEALTH;
  public isAlive: boolean = true;
  public isInvincible: boolean = false;
  public collisionRadius: number = PLAYER.SIZE;

  // Power-up state (managed externally but tracked here)
  public hasShield: boolean = false;
  public hasRapidFire: boolean = false;

  // Shooting cooldown
  public fireCooldown: number = 0;

  private invincibilityTimer: number = 0;
  private currentTilt: number = 0;
  private engineGlow: THREE.Mesh;
  private hullMaterial: THREE.MeshStandardMaterial;
  private flashTimer: number = 0;
  private originalEmissive = new THREE.Color(0x000000);
  private tmpMuzzle = new THREE.Vector3();
  private tmpForward = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.Group();
    this.hullMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER_HULL,
      metalness: 0.7,
      roughness: 0.3,
    });

    this.buildShipModel();
    this.engineGlow = this.mesh.getObjectByName('engineGlow') as THREE.Mesh;
  }

  private buildShipModel(): void {
    // Main fuselage — elongated cone
    const fuselageGeo = new THREE.ConeGeometry(0.6, 3, 6);
    fuselageGeo.rotateX(Math.PI / 2); // point forward (-Z)
    const fuselage = new THREE.Mesh(fuselageGeo, this.hullMaterial);
    fuselage.position.z = 0;
    this.mesh.add(fuselage);

    // Cockpit — small sphere on top
    const cockpitGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x224466,
      emissiveIntensity: 0.5,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.35, -0.3);
    this.mesh.add(cockpit);

    // Wings — two flat boxes angled outward
    const wingGeo = new THREE.BoxGeometry(2.5, 0.08, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER_ACCENT,
      metalness: 0.6,
      roughness: 0.4,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.2, -0.1, 0.3);
    leftWing.rotation.z = 0.1;
    this.mesh.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.2, -0.1, 0.3);
    rightWing.rotation.z = -0.1;
    this.mesh.add(rightWing);

    // Wing tips — small accent pieces
    const tipGeo = new THREE.BoxGeometry(0.15, 0.4, 0.6);
    const tipMat = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER_ENGINE,
      emissive: COLORS.PLAYER_ENGINE,
      emissiveIntensity: 0.3,
    });

    const leftTip = new THREE.Mesh(tipGeo, tipMat);
    leftTip.position.set(-2.4, -0.05, 0.3);
    this.mesh.add(leftTip);

    const rightTip = new THREE.Mesh(tipGeo, tipMat);
    rightTip.position.set(2.4, -0.05, 0.3);
    this.mesh.add(rightTip);

    // Engine glow — emissive cylinder at the rear
    const engineGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.5, 8);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({
      color: COLORS.PLAYER_ENGINE,
      emissive: COLORS.PLAYER_ENGINE,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.set(0, 0, 1.5);
    engine.name = 'engineGlow';
    this.mesh.add(engine);
  }

  public update(delta: number, input: InputManager): void {
    if (!this.isAlive) return;

    this.updateMovement(delta, input);
    this.updateRotation(delta, input);
    this.updateInvincibility(delta);
    this.updateFireCooldown(delta);
    this.updateFlash(delta);
    this.updateEngineGlow(delta, input);
  }

  private updateMovement(delta: number, input: InputManager): void {
    const speed = PLAYER.SPEED;
    let dx = 0;
    let dy = 0;

    if (input.moveLeft) dx -= 1;
    if (input.moveRight) dx += 1;
    if (input.moveUp) dy += 1;
    if (input.moveDown) dy -= 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    this.mesh.position.x += dx * speed * delta;
    this.mesh.position.y += dy * speed * delta;

    // Boundary clamping
    this.mesh.position.x = clamp(
      this.mesh.position.x,
      -PLAYER.BOUNDARY_X,
      PLAYER.BOUNDARY_X,
    );
    this.mesh.position.y = clamp(
      this.mesh.position.y,
      -PLAYER.BOUNDARY_Y,
      PLAYER.BOUNDARY_Y,
    );

    // Tilt ship when strafing
    const targetTilt = -dx * PLAYER.TILT_AMOUNT;
    this.currentTilt = damp(this.currentTilt, targetTilt, 8, delta);
    this.mesh.rotation.z = this.currentTilt;
  }

  private updateRotation(delta: number, input: InputManager): void {
    // Slight pitch based on vertical movement
    const targetPitch = input.moveDown ? 0.15 : input.moveUp ? -0.15 : 0;
    this.mesh.rotation.x = damp(this.mesh.rotation.x, targetPitch, 5, delta);

    // Yaw toward mouse position (subtle aiming feel)
    if (input.isPointerLocked) {
      const targetYaw = clamp(input.mouseDeltaX * -0.002, -0.3, 0.3);
      this.mesh.rotation.y = damp(this.mesh.rotation.y, targetYaw, 8, delta);
    } else {
      // Non-pointer-lock: aim toward normalized mouse X
      const targetYaw = -input.normalizedMouseX * 0.2;
      this.mesh.rotation.y = damp(this.mesh.rotation.y, targetYaw, 5, delta);
    }
  }

  private updateInvincibility(delta: number): void {
    if (!this.isInvincible) return;

    this.invincibilityTimer -= delta;
    if (this.invincibilityTimer <= 0) {
      this.isInvincible = false;
      this.invincibilityTimer = 0;
      this.mesh.visible = true;
    } else {
      // Blink effect during invincibility
      this.mesh.visible = Math.sin(this.invincibilityTimer * 20) > 0;
    }
  }

  private updateFireCooldown(delta: number): void {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }
  }

  private updateFlash(delta: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.hullMaterial.emissive.copy(this.originalEmissive);
        this.hullMaterial.emissiveIntensity = 0;
      }
    }
  }

  private updateEngineGlow(delta: number, input: InputManager): void {
    if (!this.engineGlow) return;
    const mat = this.engineGlow.material as THREE.MeshStandardMaterial;
    const isMoving = input.moveUp || input.moveDown || input.moveLeft || input.moveRight;
    const targetIntensity = isMoving ? 1.5 : 0.6;
    mat.emissiveIntensity = damp(mat.emissiveIntensity, targetIntensity, 6, delta);

    // Pulse effect
    const pulse = Math.sin(performance.now() * 0.008) * 0.2;
    mat.opacity = clamp(0.7 + pulse, 0.5, 1.0);
  }

  public canShoot(): boolean {
    return this.isAlive && this.fireCooldown <= 0;
  }

  public shoot(): void {
    const rate = this.hasRapidFire ? PLAYER.RAPID_FIRE_RATE : PLAYER.FIRE_RATE;
    this.fireCooldown = rate;
  }

  /** Get the world-space position of the gun muzzle (front of ship) */
  public getMuzzlePosition(): THREE.Vector3 {
    this.tmpMuzzle.set(0, 0, -1.8);
    this.mesh.localToWorld(this.tmpMuzzle);
    return this.tmpMuzzle;
  }

  /** Get forward direction of the ship */
  public getForwardDirection(): THREE.Vector3 {
    this.tmpForward.set(0, 0, -1);
    this.tmpForward.applyQuaternion(this.mesh.quaternion);
    return this.tmpForward.normalize();
  }

  public takeDamage(amount: number): void {
    if (!this.isAlive || this.isInvincible || this.hasShield) return;

    this.health -= amount;

    // Flash red on hit
    this.hullMaterial.emissive.set(0xff0000);
    this.hullMaterial.emissiveIntensity = 1.0;
    this.flashTimer = 0.15;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    } else {
      // Brief invincibility after taking damage
      this.isInvincible = true;
      this.invincibilityTimer = PLAYER.INVINCIBILITY_DURATION;
    }
  }

  public heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  private die(): void {
    this.isAlive = false;
    this.mesh.visible = false;
  }

  public reset(): void {
    this.health = PLAYER.MAX_HEALTH;
    this.isAlive = true;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.fireCooldown = 0;
    this.hasShield = false;
    this.hasRapidFire = false;
    this.currentTilt = 0;
    this.flashTimer = 0;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.visible = true;
    this.hullMaterial.emissive.copy(this.originalEmissive);
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
