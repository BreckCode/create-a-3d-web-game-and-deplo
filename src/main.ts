import { Game } from './core/Game';

let game: Game | null = null;

function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Could not find #app container');
  }

  // Basic styles for fullscreen canvas
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#000011';
  container.style.width = '100vw';
  container.style.height = '100vh';

  game = new Game(container);

  // Start the game loop (renders even in menu state)
  game.start();

  // Handle visibility changes - pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!game) return;
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { game };
