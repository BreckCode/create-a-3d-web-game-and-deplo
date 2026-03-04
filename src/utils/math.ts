import * as THREE from 'three';

/** Random float in [min, max) */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] (inclusive) */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

/** Linear interpolation between a and b by factor t */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Smooth damping (frame-rate independent lerp) */
export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

/** Remap a value from one range to another */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, t);
}

/** Distance between two Vector3s (avoids sqrt when possible — use distanceSq for comparisons) */
export function distance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

/** Squared distance between two Vector3s (cheaper than distance) */
export function distanceSq(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceToSquared(b);
}

/** Check sphere-sphere overlap */
export function spheresOverlap(
  posA: THREE.Vector3,
  radiusA: number,
  posB: THREE.Vector3,
  radiusB: number,
): boolean {
  const combinedRadius = radiusA + radiusB;
  return distanceSq(posA, posB) <= combinedRadius * combinedRadius;
}

/** Random point on a sphere surface of given radius */
export function randomOnSphere(radius: number): THREE.Vector3 {
  const theta = randomRange(0, Math.PI * 2);
  const phi = Math.acos(randomRange(-1, 1));
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

/** Random direction vector (unit length) */
export function randomDirection(): THREE.Vector3 {
  return randomOnSphere(1);
}

/** Random point in spawn plane at a given z depth */
export function randomSpawnPosition(xRange: number, yRange: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(
    randomRange(-xRange, xRange),
    randomRange(-yRange, yRange),
    z,
  );
}

/** Degrees to radians */
export function deg2rad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Radians to degrees */
export function rad2deg(radians: number): number {
  return radians * (180 / Math.PI);
}

/** Pick a random element from an array */
export function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Ease-out cubic (decelerating) */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Ease-in-out sine */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Apply noise displacement to an icosahedron vertex for asteroid generation */
export function displaceVertex(vertex: THREE.Vector3, noiseAmount: number): void {
  const offset = 1 + randomRange(-noiseAmount, noiseAmount);
  vertex.multiplyScalar(offset);
}
