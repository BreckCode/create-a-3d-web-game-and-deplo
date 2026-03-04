import { Game, GameState } from '../core/Game';

export class GameOverScreen {
  private container: HTMLElement;
  private finalScoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private newHighEl: HTMLElement;

  constructor(private game: Game) {
    this.container = document.createElement('div');
    this.container.id = 'gameover-screen';

    this.container.innerHTML = `
      <div class="gameover-content">
        <h1 class="gameover-title">GAME OVER</h1>
        <div class="gameover-score-label">FINAL SCORE</div>
        <div class="gameover-score">0</div>
        <div class="gameover-newhigh">NEW HIGH SCORE!</div>
        <div class="gameover-highscore">HIGH SCORE: 0</div>
        <button class="gameover-restart-btn" type="button">PLAY AGAIN</button>
        <div class="gameover-hint">Press ENTER to restart</div>
      </div>
    `;

    this.finalScoreEl = this.container.querySelector('.gameover-score') as HTMLElement;
    this.highScoreEl = this.container.querySelector('.gameover-highscore') as HTMLElement;
    this.newHighEl = this.container.querySelector('.gameover-newhigh') as HTMLElement;

    const btn = this.container.querySelector('.gameover-restart-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => this.restartGame());

    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);

    document.body.appendChild(this.container);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.game.state !== GameState.GAME_OVER) return;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.restartGame();
    }
  }

  private restartGame(): void {
    if (!this.game.canRestart) return;
    this.hide();
    this.game.restart();
  }

  public update(): void {
    const visible = this.game.state === GameState.GAME_OVER;
    this.container.style.display = visible ? '' : 'none';

    if (visible) {
      const score = this.game.score;
      const hi = this.game.highScore;
      this.finalScoreEl.textContent = score.toLocaleString();
      this.highScoreEl.textContent = `HIGH SCORE: ${hi.toLocaleString()}`;
      this.newHighEl.style.display = score > 0 && score >= hi ? '' : 'none';
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
