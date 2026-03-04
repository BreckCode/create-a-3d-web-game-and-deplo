import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  randomRange,
  randomInt,
  lerp,
  clamp,
  damp,
  remap,
  distance,
  distanceSq,
  spheresOverlap,
  randomOnSphere,
  randomDirection,
  randomSpawnPosition,
  deg2rad,
  rad2deg,
  randomElement,
  easeOutCubic,
  easeInOutSine,
  displaceVertex,
} from './math';

describe('randomRange', () => {
  it('returns values within the specified range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('handles negative ranges', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomRange(-10, -5);
      expect(val).toBeGreaterThanOrEqual(-10);
      expect(val).toBeLessThan(-5);
    }
  });
});

describe('randomInt', () => {
  it('returns integers within inclusive range', () => {
    const results = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const val = randomInt(1, 3);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(3);
      results.add(val);
    }
    // Should eventually produce all values 1, 2, 3
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
    expect(results.has(3)).toBe(true);
  });
});

describe('lerp', () => {
  it('returns start value at t=0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('returns end value at t=1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('clamp', () => {
  it('clamps values below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps values above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('passes through values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('damp', () => {
  it('moves current toward target', () => {
    const result = damp(0, 10, 5, 0.016);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('stays at target when already there', () => {
    const result = damp(10, 10, 5, 0.016);
    expect(result).toBeCloseTo(10);
  });
});

describe('remap', () => {
  it('remaps value from one range to another', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('clamps to output range', () => {
    expect(remap(15, 0, 10, 0, 100)).toBe(100);
    expect(remap(-5, 0, 10, 0, 100)).toBe(0);
  });

  it('handles inverted output range', () => {
    expect(remap(5, 0, 10, 100, 0)).toBe(50);
  });
});

describe('distance and distanceSq', () => {
  it('calculates distance between two points', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(3, 4, 0);
    expect(distance(a, b)).toBeCloseTo(5);
  });

  it('calculates squared distance', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(3, 4, 0);
    expect(distanceSq(a, b)).toBeCloseTo(25);
  });
});

describe('spheresOverlap', () => {
  it('detects overlapping spheres', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(3, 0, 0);
    expect(spheresOverlap(a, 2, b, 2)).toBe(true);
  });

  it('detects non-overlapping spheres', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(10, 0, 0);
    expect(spheresOverlap(a, 2, b, 2)).toBe(false);
  });

  it('detects touching spheres (edge case)', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(4, 0, 0);
    // Distance exactly equals sum of radii — should overlap (<=)
    expect(spheresOverlap(a, 2, b, 2)).toBe(true);
  });

  it('handles 3D positions', () => {
    const a = new THREE.Vector3(1, 2, 3);
    const b = new THREE.Vector3(1, 2, 4);
    expect(spheresOverlap(a, 0.6, b, 0.6)).toBe(true);
  });
});

describe('randomOnSphere', () => {
  it('returns a point at the specified radius', () => {
    for (let i = 0; i < 20; i++) {
      const point = randomOnSphere(5);
      expect(point.length()).toBeCloseTo(5, 1);
    }
  });
});

describe('randomDirection', () => {
  it('returns a unit vector', () => {
    for (let i = 0; i < 20; i++) {
      const dir = randomDirection();
      expect(dir.length()).toBeCloseTo(1, 5);
    }
  });
});

describe('randomSpawnPosition', () => {
  it('returns position within specified ranges at given z', () => {
    for (let i = 0; i < 50; i++) {
      const pos = randomSpawnPosition(10, 5, -50);
      expect(pos.x).toBeGreaterThanOrEqual(-10);
      expect(pos.x).toBeLessThanOrEqual(10);
      expect(pos.y).toBeGreaterThanOrEqual(-5);
      expect(pos.y).toBeLessThanOrEqual(5);
      expect(pos.z).toBe(-50);
    }
  });
});

describe('deg2rad and rad2deg', () => {
  it('converts degrees to radians', () => {
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
    expect(deg2rad(0)).toBe(0);
  });

  it('converts radians to degrees', () => {
    expect(rad2deg(Math.PI)).toBeCloseTo(180);
    expect(rad2deg(Math.PI / 2)).toBeCloseTo(90);
    expect(rad2deg(0)).toBe(0);
  });

  it('round-trips correctly', () => {
    expect(rad2deg(deg2rad(45))).toBeCloseTo(45);
    expect(deg2rad(rad2deg(1))).toBeCloseTo(1);
  });
});

describe('randomElement', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomElement(arr));
    }
  });

  it('works with string arrays', () => {
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomElement(arr));
    }
  });
});

describe('easing functions', () => {
  it('easeOutCubic returns 0 at t=0 and 1 at t=1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('easeOutCubic decelerates (value > t for middle values)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('easeInOutSine returns 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutSine(0)).toBeCloseTo(0);
    expect(easeInOutSine(1)).toBeCloseTo(1);
  });

  it('easeInOutSine returns 0.5 at t=0.5', () => {
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
  });
});

describe('displaceVertex', () => {
  it('modifies vertex position', () => {
    const vertex = new THREE.Vector3(1, 0, 0);
    const originalLength = vertex.length();
    // Run multiple times since it's random — at least one should change
    let changed = false;
    for (let i = 0; i < 50; i++) {
      const v = new THREE.Vector3(1, 0, 0);
      displaceVertex(v, 0.5);
      if (Math.abs(v.length() - originalLength) > 0.001) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('displacement is proportional to noiseAmount', () => {
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      const v = new THREE.Vector3(1, 0, 0);
      displaceVertex(v, 0.3);
      results.push(v.length());
    }
    // All results should be within [1 - 0.3, 1 + 0.3] = [0.7, 1.3]
    for (const len of results) {
      expect(len).toBeGreaterThanOrEqual(0.7 - 0.001);
      expect(len).toBeLessThanOrEqual(1.3 + 0.001);
    }
  });
});
