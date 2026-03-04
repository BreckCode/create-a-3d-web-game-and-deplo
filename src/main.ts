import { Game } from './core/Game';
import './styles/main.css';

let game: Game | null = null;

/** Create and show the loading screen */
function createLoadingScreen(): HTMLElement {
  const screen = document.createElement('div');
  screen.id = 'loading-screen';
  screen.innerHTML = `
    <div class="loading-title">SPACE SURVIVAL</div>
    <div class="loading-bar-container">
      <div class="loading-bar-fill"></div>
    </div>
    <div class="loading-text">LOADING...</div>
  `;
  document.body.appendChild(screen);
  return screen;
}

/** Animate loading bar progress */
function setLoadingProgress(screen: HTMLElement, percent: number): void {
  const fill = screen.querySelector('.loading-bar-fill') as HTMLElement;
  if (fill) {
    fill.style.width = `${Math.min(100, percent)}%`;
  }
}

/** Fade out and remove loading screen */
function removeLoadingScreen(screen: HTMLElement): void {
  screen.classList.add('fade-out');
  setTimeout(() => screen.remove(), 500);
}

function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Could not find #app container');
  }

  // Show loading screen
  const loadingScreen = createLoadingScreen();
  setLoadingProgress(loadingScreen, 10);

  // Use requestAnimationFrame to let the loading screen render first
  requestAnimationFrame(() => {
    setLoadingProgress(loadingScreen, 30);

    requestAnimationFrame(() => {
      // Initialize game (this creates the Three.js scene, all pools, etc.)
      game = new Game(container);
      setLoadingProgress(loadingScreen, 80);

      requestAnimationFrame(() => {
        setLoadingProgress(loadingScreen, 100);

        // Start the render loop (game stays in MENU state until player clicks Start)
        game!.startLoop();

        // Remove loading screen after a brief moment for the bar to fill visually
        setTimeout(() => removeLoadingScreen(loadingScreen), 300);
      });
    });
  });

  // Handle visibility changes - pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!game) return;
    if (document.hidden) {
      game.pause();
    }
    // Don't auto-resume on visibility restore - let the user click resume
  });

  // Handle window blur (e.g. alt-tab, clicking outside browser)
  window.addEventListener('blur', () => {
    if (!game) return;
    game.pause();
  });
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { game };
