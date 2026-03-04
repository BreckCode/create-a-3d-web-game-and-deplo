# Space Survival 3D

A 3D space survival shooter built with Three.js and TypeScript. Pilot a spaceship through an endless asteroid field, destroy enemies, collect power-ups, and chase high scores.

## Installation

```bash
git clone <repo-url>
cd space-survival-3d
npm install
```

Requires Node.js 18+.

## Running

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run test         # Run test suite (91 tests)
npm run deploy       # Build and deploy to Netlify
```

## How to Play

- **WASD / Arrow Keys** — Move ship
- **Mouse** — Aim
- **Space / Left Click** — Shoot
- **ESC** — Pause / Resume

Survive as long as possible. Destroy asteroids and enemies for points. Chain kills quickly for combo multipliers (up to 5x). Collect power-ups:

| Power-Up | Effect | Duration |
|----------|--------|----------|
| Shield (blue) | Blocks all damage | 8s |
| Rapid Fire (yellow) | Faster shooting | 6s |
| Health (green) | Restores 40 HP | Instant |

Difficulty increases over time — more and larger asteroids, enemy waves, and faster spawning.

## Project Structure

```
src/
├── main.ts              # Entry point
├── core/
│   ├── Game.ts           # Game loop, state machine, orchestration
│   ├── Scene.ts          # Three.js renderer, camera, lighting, post-processing
│   ├── InputManager.ts   # Keyboard + mouse input with pointer lock
│   ├── AudioManager.ts   # Procedural sound effects and music (Web Audio API)
│   └── AssetManager.ts   # Starfield, nebulae, space environment
├── entities/
│   ├── Player.ts         # Player ship with movement and health
│   ├── Asteroid.ts       # Procedural asteroids with object pooling
│   ├── Enemy.ts          # Enemy ships with AI and shooting
│   ├── Projectile.ts     # Projectile pool for player and enemy bullets
│   └── PowerUp.ts        # Collectible power-ups (shield, rapid fire, health)
├── systems/
│   ├── CollisionSystem.ts # Sphere-based collision detection
│   ├── SpawnSystem.ts     # Progressive difficulty spawning
│   ├── ParticleSystem.ts  # Explosions, trails, impacts, pickups
│   └── ScoreSystem.ts     # Score, combos, high scores (localStorage)
├── ui/
│   ├── HUD.ts            # Health bar, score, combo, power-up indicators
│   ├── MenuScreen.ts     # Title screen
│   └── GameOverScreen.ts # Game over with score display
├── utils/
│   ├── constants.ts      # Game configuration
│   └── math.ts           # Vector/math utilities
└── styles/
    └── main.css          # HUD and UI styling
```

## Tech Stack

- **Three.js** — 3D rendering (WebGL)
- **TypeScript** — Type-safe game logic
- **Vite** — Build tooling with HMR
- **Web Audio API** — Procedural sound effects and music
- **Vitest** — Test framework (91 tests)
- **Netlify** — Hosting and deployment

## Environment Variables

None required. All assets are procedurally generated — no external API keys or configuration needed.
