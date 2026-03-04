import { Game, GameState } from '../core/Game';

export class MenuScreen {
  private container: HTMLElement;

  constructor(private game: Game) {
    this.container = document.createElement('div');
    this.container.id = 'menu-screen';

    this.container.innerHTML = `
      <div class="menu-content">
        <h1 class="menu-title">SPACE<br><span>SURVIVAL</span></h1>
        <p class="menu-subtitle">Navigate the asteroid field. Destroy enemies. Survive.</p>
        <button class="menu-start-btn" type="button">START GAME</button>
        <div class="menu-controls">
          <div class="menu-controls-title">CONTROLS</div>
          <div class="menu-control-row"><kbd>W A S D</kbd> <span>Move ship</span></div>
          <div class="menu-control-row"><kbd>MOUSE</kbd> <span>Aim direction</span></div>
          <div class="menu-control-row"><kbd>SPACE / CLICK</kbd> <span>Fire weapons</span></div>
          <div class="menu-control-row"><kbd>ESC</kbd> <span>Pause game</span></div>
        </div>
        <div class="menu-highscore"></div>
      </div>
    `;

    const btn = this.container.querySelector('.menu-start-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => this.startGame());

    // Also start on Enter/Space key
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);

    document.body.appendChild(this.container);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.game.state !== GameState.MENU) return;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.startGame();
    }
  }

  private startGame(): void {
    if (this.game.state !== GameState.MENU) return;
    this.hide();
    this.game.restart();
  }

  public update(): void {
    const visible = this.game.state === GameState.MENU;
    this.container.style.display = visible ? '' : 'none';

    if (visible) {
      const hi = this.game.highScore;
      const hiEl = this.container.querySelector('.menu-highscore') as HTMLElement;
      hiEl.textContent = hi > 0 ? `HIGH SCORE: ${hi.toLocaleString()}` : '';
    }
  }

  public show(): void {
    this.container.style.display = '';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.container.remove();
  }
}
