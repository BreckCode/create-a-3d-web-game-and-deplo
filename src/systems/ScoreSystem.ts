import { SCORE, SPAWN } from '../utils/constants';

const HIGH_SCORE_KEY = 'space-survival-highscore';

/**
 * Tracks score with combo multipliers, survival bonuses,
 * difficulty progression, and localStorage high score persistence.
 */
export class ScoreSystem {
  public score = 0;
  public highScore = 0;
  public combo = 0;
  public comboMultiplier = 1;
  public difficulty = 0;

  private comboTimer = 0;
  private survivalAccumulator = 0;

  constructor() {
    this.highScore = this.loadHighScore();
  }

  /** Call each frame to advance survival score and combo decay */
  public update(delta: number, elapsed: number): void {
    // Difficulty curve: 0 → 1 over DIFFICULTY_RAMP_TIME
    this.difficulty = Math.min(elapsed / SPAWN.DIFFICULTY_RAMP_TIME, 1);

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.resetCombo();
      }
    }

    // Survival points
    this.survivalAccumulator += delta;
    if (this.survivalAccumulator >= 1) {
      const seconds = Math.floor(this.survivalAccumulator);
      this.score += SCORE.SURVIVAL_POINTS_PER_SECOND * seconds;
      this.survivalAccumulator -= seconds;
    }
  }

  /**
   * Award points for destroying an entity (asteroid or enemy).
   * Applies the current combo multiplier and refreshes the combo window.
   */
  public addKillScore(basePoints: number): number {
    // Advance combo
    this.combo++;
    this.comboMultiplier = Math.min(
      1 + Math.floor(this.combo / 3),
      SCORE.COMBO_MULTIPLIER_MAX,
    );
    this.comboTimer = SCORE.COMBO_WINDOW;

    const earned = basePoints * this.comboMultiplier;
    this.score += earned;
    return earned;
  }

  /** Persist high score if current score beats it. Returns true if new high score. */
  public finalizeScore(): boolean {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.highScore);
      return true;
    }
    return false;
  }

  /** Reset for a new game (does not reset highScore) */
  public reset(): void {
    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.survivalAccumulator = 0;
    this.difficulty = 0;
  }

  private resetCombo(): void {
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
  }

  // ── localStorage persistence ─────────────────────────────

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // localStorage unavailable
    }
  }
}
