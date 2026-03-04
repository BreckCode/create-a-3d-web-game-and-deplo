# Code Review Summary

## Issues Found and Fixed

### 1. Nebula opacity drift (AssetManager.ts) — Bug
The nebula layer update read `mat.opacity` as "base" each frame, then added a sinusoidal pulse. Since the modified value became the new base next frame, opacity drifted monotonically toward the 0.01 floor, eventually making all nebulae invisible.

**Fix:** Store original opacity values in `nebulaBaseOpacities[]` at creation time and reference those instead of the live material value.

### 2. Asteroid flash uses setTimeout (Asteroid.ts) — Bug
`takeDamage()` used `setTimeout(() => {...}, 80)` to reset the hit flash. With object pooling, if an asteroid is deactivated and re-activated within 80ms, the stale timeout fires and corrupts the new activation's emissive state.

**Fix:** Replaced `setTimeout` with a frame-based `flashTimer` decremented in `update(delta)`, consistent with how Player and Enemy handle flashes.

### 3. NaN from corrupted localStorage (ScoreSystem.ts) — Robustness
`parseInt(saved, 10)` returns `NaN` for non-numeric strings (e.g., manually corrupted localStorage). `NaN` would propagate through score comparisons silently.

**Fix:** Added `Number.isFinite(parsed) && parsed >= 0` validation, falling back to 0.

### 4. Stale pool caches after collision (CollisionSystem.ts) — Bug
CollisionSystem deactivates entities (projectiles, asteroids, enemies, power-ups) but never called `markDirty()` on their pools. The cached `getActive()` results remained stale until the next pool `update()` call. This caused the engine trail loop in `Game.ts` to iterate dead enemies, creating particles at wrong positions.

**Fix:** Added `markDirty()` calls on all affected pools after every deactivation in CollisionSystem. Added `markDirty()` to `ProjectilePool` (was missing). Updated pool interfaces to require `markDirty()`.

### 5. Per-frame Vector3 allocations in Player (Player.ts) — Performance
`getMuzzlePosition()` and `getForwardDirection()` allocated new `Vector3` objects on every call (every frame while shooting). With rapid fire at 0.06s cooldown, this creates significant GC pressure.

**Fix:** Reuse pre-allocated `tmpMuzzle` and `tmpForward` instance fields. Callers (`ProjectilePool.fire`) already `.copy()` the values, so this is safe.

### 6. Unused import in test (SpawnSystem.test.ts) — Cleanup
`ENEMY` was imported but never used, causing a TypeScript error with `noUnusedLocals`.

**Fix:** Removed unused import.

## Verification
- TypeScript: 0 errors
- Build: passes (579 KB JS, 9.9 KB CSS)
- Tests: 91/91 passing
