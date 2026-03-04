# Architecture

## Design Pattern
Entity-Component-System (ECS) inspired architecture with a central game loop.

## Folder Structure
```
src/
├── main.ts                 # Entry point, initializes game
├── core/
│   ├── Game.ts             # Main game class, orchestrates everything
│   ├── Scene.ts            # Three.js scene setup, camera, renderer
│   ├── InputManager.ts     # Keyboard + mouse input handling
│   ├── AudioManager.ts     # Sound effects and music via Web Audio API
│   └── AssetManager.ts     # Procedural geometry/material creation
├── entities/
│   ├── Player.ts           # Player ship, movement, shooting
│   ├── Asteroid.ts         # Asteroid obstacles with varied sizes
│   ├── Enemy.ts            # Enemy ships with AI behavior
│   ├── Projectile.ts       # Bullets/lasers from player and enemies
│   └── PowerUp.ts          # Collectible power-ups
├── systems/
│   ├── CollisionSystem.ts  # AABB/sphere collision detection
│   ├── SpawnSystem.ts      # Manages spawning of asteroids, enemies, power-ups
│   ├── ParticleSystem.ts   # Explosions, trails, impact effects
│   └── ScoreSystem.ts      # Score tracking, combos, high scores
├── ui/
│   ├── HUD.ts              # In-game overlay (health, score, power-ups)
│   ├── MenuScreen.ts       # Start/title screen
│   └── GameOverScreen.ts   # Game over with score and restart
├── utils/
│   ├── math.ts             # Vector helpers, random ranges
│   └── constants.ts        # Game configuration constants
└── styles/
    └── main.css            # Global styles, HUD styling
public/
├── favicon.svg
index.html
```

## Game Loop
```
Input → Update Entities → Run Systems → Render → UI Update
```

1. **InputManager** captures keyboard/mouse state
2. **Game.update()** called via requestAnimationFrame
3. Each entity updates position/state based on input and AI
4. **CollisionSystem** checks all entity pairs
5. **SpawnSystem** manages entity lifecycle
6. **ParticleSystem** updates visual effects
7. Three.js renderer draws the scene
8. **HUD** updates DOM overlay

## Key Design Decisions
- **Procedural assets**: All 3D models built from Three.js primitives (no external model files needed) — ships from combined geometries, asteroids from icosahedrons with vertex noise
- **Object pooling**: Reuse projectile and particle objects to avoid GC pauses
- **DOM-based UI**: HUD and menus use HTML/CSS overlaid on the canvas for easy styling
- **Local storage**: High scores persisted via localStorage

## Data Flow
- Game state is centralized in the Game class
- Entities register themselves with the Game and are tracked in typed arrays
- Systems operate on entity arrays each frame
- UI reads from game state, never modifies it directly
