import { InputManager } from './InputManager';
import { Scene } from './Scene';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
}

export class Game {
  public scene: Scene;
  public input: InputManager;
  public state: GameState = GameState.MENU;
  public score = 0;
  public highScore = 0;
  public elapsed = 0;

  private lastTime = 0;
  private animationFrameId = 0;
  private running = false;

  constructor(container: HTMLElement) {
    this.scene = new Scene(container);
    this.input = new InputManager(this.scene.renderer.domElement);
    this.highScore = this.loadHighScore();
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.state = GameState.PLAYING;
    this.score = 0;
    this.elapsed = 0;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public pause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
    }
  }

  public resume(): void {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.lastTime = performance.now();
    }
  }

  public gameOver(): void {
    this.state = GameState.GAME_OVER;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.highScore);
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min((time - this.lastTime) / 1000, 0.05); // cap at 50ms to avoid spiral
    this.lastTime = time;

    if (this.state === GameState.PLAYING) {
      this.elapsed += delta;
      this.update(delta);
    }

    this.scene.render();
    this.input.update();
  };

  private update(_delta: number): void {
    // Entity updates, collision checks, spawning, etc. will be added in later tasks
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('space-survival-highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number): void {
    try {
      localStorage.setItem('space-survival-highscore', String(score));
    } catch {
      // localStorage unavailable
    }
  }

  public dispose(): void {
    this.stop();
    this.input.dispose();
    this.scene.dispose();
  }
}
