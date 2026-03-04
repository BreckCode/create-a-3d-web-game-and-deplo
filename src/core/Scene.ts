import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export class Scene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public environment: AssetManager;

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
    this.camera.position.set(0, 10, 30);
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
  };

  /** Update animated environment elements */
  public update(delta: number): void {
    this.environment.update(delta);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
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
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
