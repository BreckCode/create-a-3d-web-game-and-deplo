# Space Survival 3D

## Overview
A 3D space survival shooter game where players pilot a spaceship through an endless asteroid field, dodging obstacles, collecting power-ups, and destroying enemies. The game features progressive difficulty, a scoring system, and polished visual effects.

## Requirements
- Immersive 3D space environment with stars, nebulae, and lighting
- Player-controlled spaceship with smooth movement (WASD/arrow keys + mouse)
- Procedurally generated asteroid field that scrolls toward the player
- Enemy ships that spawn in waves with increasing difficulty
- Shooting mechanics with projectile physics
- Power-up system (shields, rapid fire, health)
- Collision detection between all entities
- Score tracking with local high score persistence
- HUD displaying health, score, and active power-ups
- Start screen, game over screen, and restart flow
- Responsive design that works on desktop browsers
- Particle effects for explosions, engine trails, and impacts
- Sound effects and background music (Web Audio API)
- Deploy to a public URL via Netlify

## Tech Stack
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| Three.js | 3D rendering | Industry standard WebGL library, huge community |
| TypeScript | Language | Type safety catches bugs early in game dev |
| Vite | Build tool | Fast HMR, optimized builds, zero config |
| Web Audio API | Sound | Built-in browser API, no extra dependencies |
| Netlify | Hosting | Free tier, CLI deploy, instant public URL |

## How to Run
```bash
npm install        # Install dependencies
npm run dev        # Start dev server on http://localhost:3000
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run deploy     # Build and deploy to Netlify
```
