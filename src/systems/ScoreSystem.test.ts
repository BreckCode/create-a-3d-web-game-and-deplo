import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreSystem } from './ScoreSystem';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('ScoreSystem', () => {
  let score: ScoreSystem;

  beforeEach(() => {
    localStorageMock.clear();
    score = new ScoreSystem();
  });

  describe('initial state', () => {
    it('starts with zero score', () => {
      expect(score.score).toBe(0);
    });

    it('starts with combo multiplier of 1', () => {
      expect(score.comboMultiplier).toBe(1);
    });

    it('starts with zero difficulty', () => {
      expect(score.difficulty).toBe(0);
    });
  });

  describe('addKillScore', () => {
    it('adds base points with 1x multiplier for first kill', () => {
      const earned = score.addKillScore(100);
      expect(earned).toBe(100);
      expect(score.score).toBe(100);
    });

    it('builds combo multiplier after 3 kills', () => {
      score.addKillScore(100); // combo 1
      score.addKillScore(100); // combo 2
      score.addKillScore(100); // combo 3 → multiplier becomes 2x
      const earned = score.addKillScore(100); // combo 4, still 2x
      expect(earned).toBe(200);
      expect(score.comboMultiplier).toBe(2);
    });

    it('caps combo multiplier at 5x', () => {
      // Need 12 kills to reach 5x: floor(12/3) + 1 = 5
      for (let i = 0; i < 12; i++) {
        score.addKillScore(10);
      }
      expect(score.comboMultiplier).toBe(5);

      // More kills shouldn't increase it further
      score.addKillScore(10);
      expect(score.comboMultiplier).toBe(5);
    });

    it('accumulates score correctly across multiple kills', () => {
      // Kill 1: combo=1, mult=1, earned=100
      // Kill 2: combo=2, mult=1, earned=100
      // Kill 3: combo=3, mult=2, earned=200
      score.addKillScore(100);
      score.addKillScore(100);
      score.addKillScore(100);
      expect(score.score).toBe(400); // 100 + 100 + 200
    });
  });

  describe('combo decay', () => {
    it('resets combo when timer expires', () => {
      score.addKillScore(100);
      expect(score.combo).toBe(1);

      // Simulate time passing beyond combo window (2.0s)
      score.update(2.5, 2.5);
      expect(score.combo).toBe(0);
      expect(score.comboMultiplier).toBe(1);
    });

    it('keeps combo alive while timer is active', () => {
      score.addKillScore(100);
      score.update(1.0, 1.0); // Only 1s passed, combo window is 2s
      expect(score.combo).toBe(1);
    });
  });

  describe('survival points', () => {
    it('awards points for surviving each second', () => {
      score.update(1.0, 1.0);
      expect(score.score).toBe(1); // SURVIVAL_POINTS_PER_SECOND = 1
    });

    it('accumulates fractional seconds', () => {
      score.update(0.5, 0.5);
      expect(score.score).toBe(0); // Not a full second yet
      score.update(0.6, 1.1);
      expect(score.score).toBe(1); // Now it's been 1.1s total
    });
  });

  describe('difficulty progression', () => {
    it('increases difficulty over time', () => {
      score.update(0.016, 30); // 30 seconds in
      expect(score.difficulty).toBeCloseTo(30 / 120); // DIFFICULTY_RAMP_TIME = 120
    });

    it('caps difficulty at 1', () => {
      score.update(0.016, 200); // Way past ramp time
      expect(score.difficulty).toBe(1);
    });
  });

  describe('high score persistence', () => {
    it('saves new high score on finalize', () => {
      score.addKillScore(500);
      const isNew = score.finalizeScore();
      expect(isNew).toBe(true);
      expect(score.highScore).toBe(500);
    });

    it('does not save if score is lower than high score', () => {
      score.addKillScore(500);
      score.finalizeScore();
      score.reset();
      score.addKillScore(100);
      const isNew = score.finalizeScore();
      expect(isNew).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets score but preserves high score', () => {
      score.addKillScore(500);
      score.finalizeScore();
      score.reset();
      expect(score.score).toBe(0);
      expect(score.combo).toBe(0);
      expect(score.comboMultiplier).toBe(1);
      expect(score.difficulty).toBe(0);
      expect(score.highScore).toBe(500);
    });
  });
});
