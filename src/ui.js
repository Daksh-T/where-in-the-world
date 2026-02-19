/**
 * UI — DOM manipulation layer
 * Handles all visual updates: progress dots, captions, reveal overlay, game over
 */

export class UI {
  constructor() {
    this.progressDots = document.getElementById('progressDots');
    this.roundLabel = document.getElementById('roundLabel');
    this.roundImage = document.getElementById('roundImage');
    this.imageCaption = document.getElementById('imageCaption');
    this.imageFrame = document.getElementById('imageFrame');
    this.revealOverlay = document.getElementById('revealOverlay');
    this.revealCard = document.getElementById('revealCard');
    this.revealFlag = document.getElementById('revealFlag');
    this.revealCountryName = document.getElementById('revealCountryName');
    this.revealFunFact = document.getElementById('revealFunFact');
    this.nextBtn = document.getElementById('nextBtn');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.gameOverCountries = document.getElementById('gameOverCountries');
    this.loadingScreen = document.getElementById('loadingScreen');
    this.loadingBarFill = document.getElementById('loadingBarFill');
  }

  /**
   * Build the 10 progress dots
   */
  initProgressDots(totalRounds) {
    this.progressDots.innerHTML = '';
    for (let i = 0; i < totalRounds; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.dataset.index = i;
      this.progressDots.appendChild(dot);
    }
  }

  /**
   * Update progress dots for current round (0-indexed)
   */
  updateProgressDots(currentRoundIndex, totalRounds) {
    const dots = this.progressDots.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('completed', 'current');
      if (i < currentRoundIndex) {
        dot.classList.add('completed');
      } else if (i === currentRoundIndex) {
        dot.classList.add('current');
      }
    });
    this.roundLabel.textContent = `Round ${currentRoundIndex + 1} of ${totalRounds}`;
  }

  /**
   * Set the round image and caption
   */
  setRoundImage(imageFile, caption) {
    // Add loading class for fade effect
    this.roundImage.classList.add('loading');

    // Remove any existing placeholder
    const existing = this.imageFrame.querySelector('.image-placeholder');
    if (existing) existing.remove();

    const img = new Image();
    img.onload = () => {
      this.roundImage.src = imageFile;
      this.roundImage.classList.remove('loading');
    };
    img.onerror = () => {
      // Show placeholder if image not found
      this.roundImage.src = '';
      this.roundImage.classList.remove('loading');
      this._showImagePlaceholder(imageFile);
    };
    img.src = imageFile;

    this.imageCaption.textContent = caption;
  }

  _showImagePlaceholder(filename) {
    // Remove existing placeholder
    const existing = this.imageFrame.querySelector('.image-placeholder');
    if (existing) existing.remove();

    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.innerHTML = `
      <div class="image-placeholder-icon">🖼️</div>
      <div class="image-placeholder-text">
        Place your image here:<br>
        <strong>public/${filename}</strong>
      </div>
    `;
    this.imageFrame.appendChild(placeholder);
  }

  /**
   * Show the country reveal overlay
   */
  showReveal(countryName, flagEmoji, funFact) {
    this.revealFlag.textContent = flagEmoji;
    this.revealCountryName.textContent = countryName;
    this.revealFunFact.textContent = funFact;
    this.revealOverlay.classList.add('visible');
  }

  /**
   * Hide the reveal overlay
   */
  hideReveal() {
    this.revealOverlay.classList.remove('visible');
    // Reset card for re-animation
    this.revealCard.style.animation = 'none';
    void this.revealCard.offsetWidth; // reflow
    this.revealCard.style.animation = '';
  }

  /**
   * Show the Next button
   */
  showNextButton() {
    this.nextBtn.classList.remove('hidden');
  }

  /**
   * Hide the Next button
   */
  hideNextButton() {
    this.nextBtn.classList.add('hidden');
  }

  /**
   * Set body phase class for CSS phase-specific styling
   */
  setPhaseClass(phase) {
    // Remove all phase classes
    document.body.className = document.body.className
      .replace(/phase-[\w-]+/g, '')
      .trim();
    // Add new phase class
    const cssClass = 'phase-' + phase.toLowerCase().replace(/_/g, '-');
    document.body.classList.add(cssClass);
  }

  /**
   * Show the game over screen with all visited countries
   */
  showGameOver(rounds) {
    this.gameOverCountries.innerHTML = '';
    rounds.forEach((round, i) => {
      const chip = document.createElement('div');
      chip.className = 'game-over-country-chip';
      chip.style.animationDelay = `${(i + 1) * 0.1}s`;
      chip.innerHTML = `<span>${round.flagEmoji}</span><span>${round.countryName}</span>`;
      this.gameOverCountries.appendChild(chip);
    });

    this.gameOverScreen.classList.add('visible');
    this.hideNextButton();
  }

  /**
   * Hide the game over screen (for restart)
   */
  hideGameOver() {
    this.gameOverScreen.classList.remove('visible');
  }

  /**
   * Update loading bar progress (0-100)
   */
  setLoadingProgress(percent) {
    this.loadingBarFill.style.width = `${percent}%`;
  }

  /**
   * Hide the loading screen
   */
  hideLoadingScreen() {
    this.loadingScreen.classList.add('hidden');
    // Remove from DOM after transition
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 700);
  }

  /**
   * Get the reveal card element (for GSAP animations)
   */
  getRevealCard() {
    return this.revealCard;
  }
}
