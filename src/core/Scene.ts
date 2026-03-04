import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { AssetManager } from './AssetManager';
import { SCENE } from '../utils/constants';
import { damp } from '../utils/math';

export class Scene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public environment: AssetManager;

  // Screen shake state
  private shakeIntensity = 0;
  private cameraBasePosition = new THREE.Vector3(0, SCENE.CAMERA_OFFSET_Y, SCENE.CAMERA_OFFSET_Z);

  // Hit flash overlay
  private flashOverlay: HTMLElement;
  private flashOpacity = 0;

  // Post-processing
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  // Smooth camera tracking
  private cameraTargetY: number = SCENE.CAMERA_OFFSET_Y;

  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000011, 0.0008);

    // Camera - positioned behind and above the play area, looking forward
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.copy(this.cameraBasePosition);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000011);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Post-processing pipeline
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,   // strength
      0.4,   // radius
      0.85,  // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Hit flash overlay (red screen flash on damage)
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:radial-gradient(ellipse at center,rgba(255,0,0,0.0) 30%,rgba(255,0,0,0.0) 100%);' +
      'pointer-events:none;z-index:50;opacity:0;transition:none;';
    document.body.appendChild(this.flashOverlay);

    // Lighting
    this.setupLighting();

    // Space environment (starfield, nebulae)
    this.environment = new AssetManager();
    this.scene.add(this.environment.group);

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting(): void {
    // Ambient light for base visibility
    const ambient = new THREE.AmbientLight(0x222244, 0.6);
    this.scene.add(ambient);

    // Main directional light (sun-like)
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(50, 50, 50);
    this.scene.add(directional);

    // Fill light from below/behind for rim lighting effect
    const fillLight = new THREE.DirectionalLight(0x4466ff, 0.4);
    fillLight.position.set(-20, -10, -30);
    this.scene.add(fillLight);

    // Point light near player area for local illumination
    const pointLight = new THREE.PointLight(0x6688ff, 0.8, 100);
    pointLight.position.set(0, 10, 20);
    this.scene.add(pointLight);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  };

  /** Trigger screen shake (called when player takes damage) */
  public triggerShake(intensity: number = SCENE.SCREEN_SHAKE_INTENSITY): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /** Trigger red flash overlay (called on player hit) */
  public triggerHitFlash(intensity: number = 0.6): void {
    this.flashOpacity = Math.max(this.flashOpacity, intensity);
  }

  /** Set smooth camera tracking target (follows player Y slightly) */
  public setCameraTrackY(playerY: number): void {
    this.cameraTargetY = SCENE.CAMERA_OFFSET_Y + playerY * 0.15;
  }

  /** Update animated environment elements */
  public update(delta: number): void {
    this.environment.update(delta);

    // Smooth camera Y tracking
    this.camera.position.y = damp(this.camera.position.y, this.cameraTargetY, 3, delta);

    // Screen shake
    if (this.shakeIntensity > 0.001) {
      const sx = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.camera.position.x = this.cameraBasePosition.x + sx;
      this.camera.position.z = this.cameraBasePosition.z + (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      // Add shake to Y without overriding smooth tracking
      this.camera.position.y += sy;

      this.shakeIntensity = damp(this.shakeIntensity, 0, SCENE.SCREEN_SHAKE_DECAY, delta);
    } else {
      this.shakeIntensity = 0;
      this.camera.position.x = this.cameraBasePosition.x;
      this.camera.position.z = this.cameraBasePosition.z;
    }

    // Hit flash overlay fade-out
    if (this.flashOpacity > 0.001) {
      this.flashOpacity = damp(this.flashOpacity, 0, 6, delta);
      const a = this.flashOpacity;
      this.flashOverlay.style.background =
        `radial-gradient(ellipse at center, rgba(255,50,0,${a * 0.3}) 30%, rgba(255,0,0,${a}) 100%)`;
      this.flashOverlay.style.opacity = '1';
    } else {
      this.flashOpacity = 0;
      this.flashOverlay.style.opacity = '0';
    }
  }

  public render(): void {
    this.composer.render();
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.environment.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.flashOverlay.remove();
    this.container.removeChild(this.renderer.domElement);
  }
}
