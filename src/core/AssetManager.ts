import * as THREE from 'three';
import { SCENE } from '../utils/constants';
import { randomRange } from '../utils/math';

/**
 * Creates and manages the space background environment:
 * - Starfield (particle system with varied sizes/brightness)
 * - Scrolling nebula backdrop
 * - Distant galaxy clusters
 */
export class AssetManager {
  /** The root group containing all background elements */
  public group: THREE.Group;

  // Starfield
  private starGeometry: THREE.BufferGeometry;
  private starMaterial: THREE.PointsMaterial;
  private stars: THREE.Points;

  // Nebula layers
  private nebulaLayers: THREE.Mesh[] = [];
  private nebulaTime = 0;

  constructor() {
    this.group = new THREE.Group();

    // ── Starfield ──
    const starCount = SCENE.STAR_COUNT;
    const spread = SCENE.STAR_SPREAD;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const starColors = [
      new THREE.Color(0xffffff), // white
      new THREE.Color(0xaaccff), // blue-white
      new THREE.Color(0xffddaa), // warm yellow
      new THREE.Color(0xffaaaa), // red-ish
      new THREE.Color(0xaaaaff), // blue
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = randomRange(-spread, spread);
      positions[i3 + 1] = randomRange(-spread, spread);
      positions[i3 + 2] = randomRange(-spread, spread);

      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const brightness = randomRange(0.4, 1.0);
      colors[i3] = color.r * brightness;
      colors[i3 + 1] = color.g * brightness;
      colors[i3 + 2] = color.b * brightness;

      sizes[i] = randomRange(0.5, 2.5);
    }

    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stars = new THREE.Points(this.starGeometry, this.starMaterial);
    this.group.add(this.stars);

    // ── Nebula layers ──
    this.createNebulaLayers();
  }

  private createNebulaLayers(): void {
    const nebulaConfigs = [
      { color: 0x1a0533, opacity: 0.15, z: -400, scale: 500, yOffset: 80 },
      { color: 0x0a1a3a, opacity: 0.12, z: -350, scale: 400, yOffset: -60 },
      { color: 0x2a0a2a, opacity: 0.10, z: -300, scale: 350, yOffset: 40 },
      { color: 0x0a2a3a, opacity: 0.08, z: -250, scale: 300, yOffset: -30 },
    ];

    for (const config of nebulaConfigs) {
      const geometry = new THREE.PlaneGeometry(config.scale, config.scale);
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        randomRange(-50, 50),
        config.yOffset,
        config.z,
      );
      mesh.rotation.z = randomRange(0, Math.PI * 2);

      this.nebulaLayers.push(mesh);
      this.group.add(mesh);
    }

    // Add a few distant bright nebula "clouds" using large translucent spheres
    const cloudConfigs = [
      { color: 0x3311aa, opacity: 0.04, pos: new THREE.Vector3(-200, 100, -450), radius: 150 },
      { color: 0xaa2244, opacity: 0.03, pos: new THREE.Vector3(180, -80, -400), radius: 120 },
      { color: 0x114488, opacity: 0.035, pos: new THREE.Vector3(50, 150, -500), radius: 180 },
    ];

    for (const cloud of cloudConfigs) {
      const geometry = new THREE.IcosahedronGeometry(cloud.radius, 2);
      const material = new THREE.MeshBasicMaterial({
        color: cloud.color,
        transparent: true,
        opacity: cloud.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(cloud.pos);
      this.nebulaLayers.push(mesh);
      this.group.add(mesh);
    }
  }

  /** Called every frame to animate background elements */
  public update(delta: number): void {
    this.nebulaTime += delta;

    // Slowly rotate the starfield for a subtle drift effect
    this.stars.rotation.y += delta * 0.002;
    this.stars.rotation.x += delta * 0.001;

    // Gently pulse and drift nebula layers
    for (let i = 0; i < this.nebulaLayers.length; i++) {
      const layer = this.nebulaLayers[i];
      // Slow rotation
      layer.rotation.z += delta * 0.01 * (i % 2 === 0 ? 1 : -1);

      // Subtle color pulsing via opacity
      const mat = layer.material as THREE.MeshBasicMaterial;
      const baseOpacity = mat.opacity;
      const pulse = Math.sin(this.nebulaTime * 0.3 + i * 1.5) * 0.01;
      mat.opacity = Math.max(0.01, baseOpacity + pulse);
    }

    // Twinkle stars by slightly modifying individual star sizes
    const sizeAttr = this.starGeometry.getAttribute('size') as THREE.BufferAttribute;
    const sizeArray = sizeAttr.array as Float32Array;
    // Only update a subset each frame for performance
    const updateCount = 50;
    const offset = Math.floor(this.nebulaTime * 60) % sizeArray.length;
    for (let i = 0; i < updateCount; i++) {
      const idx = (offset + i) % sizeArray.length;
      sizeArray[idx] = randomRange(0.3, 2.8);
    }
    sizeAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.starGeometry.dispose();
    this.starMaterial.dispose();

    for (const layer of this.nebulaLayers) {
      (layer.geometry as THREE.BufferGeometry).dispose();
      (layer.material as THREE.Material).dispose();
    }
  }
}
