/**
 * main.js — Entry point for "Where in the World?"
 * Bootstraps all modules and wires up event listeners
 */

import { ROUNDS } from './gameData.js';
import { GlobeManager } from './globeManager.js';
import { AnimationController } from './animationController.js';
import { UI } from './ui.js';
import { GameController } from './gameController.js';

async function init() {
  const ui = new UI();

  // Initialize progress dots
  ui.initProgressDots(ROUNDS.length);
  ui.setLoadingProgress(10);

  // Get DOM elements for animation targets
  const imageContainer = document.getElementById('imageContainer');
  const globeSlider    = document.getElementById('globeWrapper');   // .globe-slider
  const globeOuter     = document.getElementById('globeOuter');     // .globe-wrapper (centering anchor)
  const globeContainer = document.getElementById('globeContainer');
  const nextBtn        = document.getElementById('nextBtn');
  const restartBtn     = document.getElementById('restartBtn');

  // Read the globe size from the outer wrapper's computed width (set by CSS)
  const computedOuter = window.getComputedStyle(globeOuter);
  const globeSize = parseInt(computedOuter.width) || 700;

  // Explicitly size the globe container so Three.js renderer has real dimensions
  globeContainer.style.width  = globeSize + 'px';
  globeContainer.style.height = globeSize + 'px';

  // Also size the slider to match
  globeSlider.style.width  = globeSize + 'px';
  globeSlider.style.height = globeSize + 'px';

  ui.setLoadingProgress(20);

  // Initialize Globe
  const globeManager = new GlobeManager(globeContainer);
  await globeManager.init((progress) => {
    // Map globe init progress (0-100) to loading bar (20-90)
    ui.setLoadingProgress(20 + progress * 0.7);
  });

  ui.setLoadingProgress(95);

  // Initialize Animation Controller
  const animationController = new AnimationController(imageContainer, globeSlider);

  // Initialize Game Controller
  const gameController = new GameController({
    rounds: ROUNDS,
    globeManager,
    animationController,
    ui
  });

  ui.setLoadingProgress(100);

  // Hide loading screen after a brief moment
  await new Promise(resolve => setTimeout(resolve, 400));
  ui.hideLoadingScreen();

  // Start the game
  gameController.start();

  // ── Event Listeners ──────────────────────────────────────────

  // Next button click
  nextBtn.addEventListener('click', () => {
    gameController.advance();
  });

  // Enter / Space key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      gameController.advance();
    }
  });

  // Restart button
  restartBtn.addEventListener('click', () => {
    gameController.restart();
  });

  // Handle window resize — resize globe renderer
  window.addEventListener('resize', () => {
    const cs = window.getComputedStyle(globeOuter);
    const newSize = parseInt(cs.width) || 700;
    globeContainer.style.width  = newSize + 'px';
    globeContainer.style.height = newSize + 'px';
    globeSlider.style.width  = newSize + 'px';
    globeSlider.style.height = newSize + 'px';
    globeManager.resize(newSize, newSize);
  });

  // Preload all round images in the background
  _preloadImages(ROUNDS);
}

/**
 * Preload all round images so they're cached when needed
 */
function _preloadImages(rounds) {
  rounds.forEach(round => {
    const img = new Image();
    img.src = round.imageFile;
  });
}

// Boot
init().catch(err => {
  console.error('Failed to initialize game:', err);
  // Hide loading screen even on error
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 700);
  }
});
