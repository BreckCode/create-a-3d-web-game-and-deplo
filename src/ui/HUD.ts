import { Game, GameState } from '../core/Game';
import { PLAYER } from '../utils/constants';

export class HUD {
  private container: HTMLElement;
  private scoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private comboEl: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private shieldPowerUp: HTMLElement;
  private shieldTimer: HTMLElement;
  private rapidFirePowerUp: HTMLElement;
  private rapidFireTimer: HTMLElement;

  private lastComboMultiplier = 1;

  constructor(private game: Game) {
    this.container = document.createElement('div');
    this.container.id = 'hud';

    // Top bar — score + high score on left
    const top = document.createElement('div');
    top.className = 'hud-top';

    const scoreBlock = document.createElement('div');
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';
    this.scoreEl.textContent = '0';
    this.highScoreEl = document.createElement('div');
    this.highScoreEl.className = 'hud-highscore';
    this.highScoreEl.textContent = 'HI 0';
    scoreBlock.appendChild(this.scoreEl);
    scoreBlock.appendChild(this.highScoreEl);
    top.appendChild(scoreBlock);

    // Combo — top center
    this.comboEl = document.createElement('div');
    this.comboEl.className = 'hud-combo';
    this.comboEl.textContent = 'x2 COMBO';

    // Health bar — bottom-left
    const health = document.createElement('div');
    health.className = 'hud-health';
    const healthLabel = document.createElement('div');
    healthLabel.className = 'hud-health-label';
    healthLabel.textContent = 'Hull';
    const healthBar = document.createElement('div');
    healthBar.className = 'hud-health-bar';
    this.healthFill = document.createElement('div');
    this.healthFill.className = 'hud-health-fill';
    healthBar.appendChild(this.healthFill);
    this.healthText = document.createElement('div');
    this.healthText.className = 'hud-health-text';
    this.healthText.textContent = '100 / 100';
    health.appendChild(healthLabel);
    health.appendChild(healthBar);
    health.appendChild(this.healthText);

    // Power-ups — bottom-right
    const powerUps = document.createElement('div');
    powerUps.className = 'hud-powerups';

    this.shieldPowerUp = this.createPowerUpElement('S', 'shield', 'Shield');
    this.rapidFirePowerUp = this.createPowerUpElement('R', 'rapid-fire', 'Rapid');
    this.shieldTimer = this.shieldPowerUp.querySelector('.hud-powerup-timer')!;
    this.rapidFireTimer = this.rapidFirePowerUp.querySelector('.hud-powerup-timer')!;

    powerUps.appendChild(this.shieldPowerUp);
    powerUps.appendChild(this.rapidFirePowerUp);

    // Assemble
    this.container.appendChild(top);
    this.container.appendChild(this.comboEl);
    this.container.appendChild(health);
    this.container.appendChild(powerUps);

    document.body.appendChild(this.container);
  }

  private createPowerUpElement(icon: string, cssClass: string, label: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'hud-powerup';

    const iconEl = document.createElement('div');
    iconEl.className = `hud-powerup-icon ${cssClass}`;
    iconEl.textContent = icon;

    const timerEl = document.createElement('div');
    timerEl.className = 'hud-powerup-timer';
    timerEl.textContent = '0s';

    const labelEl = document.createElement('div');
    labelEl.className = 'hud-powerup-label';
    labelEl.textContent = label;

    el.appendChild(iconEl);
    el.appendChild(timerEl);
    el.appendChild(labelEl);
    return el;
  }

  public update(): void {
    const visible = this.game.state === GameState.PLAYING || this.game.state === GameState.PAUSED;
    this.container.style.display = visible ? '' : 'none';
    if (!visible) return;

    // Score
    this.scoreEl.textContent = this.game.score.toLocaleString();

    // High score
    const hi = this.game.highScore;
    this.highScoreEl.textContent = hi > 0 ? `HI ${hi.toLocaleString()}` : '';

    // Health bar
    const hp = this.game.player.health;
    const maxHp = PLAYER.MAX_HEALTH;
    const pct = Math.max(0, hp / maxHp) * 100;
    this.healthFill.style.width = `${pct}%`;
    this.healthText.textContent = `${Math.ceil(hp)} / ${maxHp}`;

    // Health bar color classes
    this.healthFill.classList.toggle('low', pct <= 50 && pct > 25);
    this.healthFill.classList.toggle('critical', pct <= 25);

    // Combo multiplier
    const mult = this.game.scoreSystem.comboMultiplier;
    if (mult > 1) {
      this.comboEl.textContent = `x${mult} COMBO`;
      this.comboEl.classList.add('active');
      if (mult > this.lastComboMultiplier) {
        this.comboEl.classList.remove('pulse');
        // Force reflow for re-trigger
        void this.comboEl.offsetWidth;
        this.comboEl.classList.add('pulse');
      }
    } else {
      this.comboEl.classList.remove('active');
    }
    this.lastComboMultiplier = mult;

    // Power-up indicators
    this.updatePowerUp(
      this.shieldPowerUp,
      this.shieldTimer,
      this.game.player.hasShield,
      this.game.shieldTimer,
    );
    this.updatePowerUp(
      this.rapidFirePowerUp,
      this.rapidFireTimer,
      this.game.player.hasRapidFire,
      this.game.rapidFireTimer,
    );
  }

  private updatePowerUp(el: HTMLElement, timerEl: HTMLElement, active: boolean, remaining: number): void {
    if (active && remaining > 0) {
      el.classList.add('active');
      timerEl.textContent = `${Math.ceil(remaining)}s`;
    } else {
      el.classList.remove('active');
    }
  }

  public show(): void {
    this.container.style.display = '';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public dispose(): void {
    this.container.remove();
  }
}
