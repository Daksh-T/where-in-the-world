/**
 * GameController — state machine for the game flow
 *
 * Phases:
 *   IMAGE_DISPLAY  → user sees image, presses Next
 *   IMAGE_EXIT     → image slides up (auto)
 *   GLOBE_ENTER    → globe rises (auto)
 *   GLOBE_SPINNING → globe spins dramatically (auto)
 *   GLOBE_SETTLING → globe flies to country (auto)
 *   COUNTRY_REVEAL → country highlighted, label shown, user presses Next
 *   GAME_OVER      → all rounds done
 */

export const PHASES = {
  IMAGE_DISPLAY: 'IMAGE_DISPLAY',
  IMAGE_EXIT: 'IMAGE_EXIT',
  GLOBE_ENTER: 'GLOBE_ENTER',
  GLOBE_SPINNING: 'GLOBE_SPINNING',
  GLOBE_SETTLING: 'GLOBE_SETTLING',
  COUNTRY_REVEAL: 'COUNTRY_REVEAL',
  GAME_OVER: 'GAME_OVER'
};

export class GameController {
  constructor({ rounds, globeManager, animationController, ui }) {
    this.rounds = rounds;
    this.globeManager = globeManager;
    this.animationController = animationController;
    this.ui = ui;

    this.currentRoundIndex = 0;
    this.phase = PHASES.IMAGE_DISPLAY;
    this._busy = false; // prevent double-advance during animations
  }

  /**
   * Start the game from round 0
   */
  start() {
    this.currentRoundIndex = 0;
    this.phase = PHASES.IMAGE_DISPLAY;
    this._startRound(0);
  }

  /**
   * Restart the game
   */
  restart() {
    this.ui.hideGameOver();
    this.ui.hideReveal();
    this.globeManager.resetForNextRound();
    this.animationController.resetImage();
    this.animationController.hideGlobe();
    this.currentRoundIndex = 0;
    this.phase = PHASES.IMAGE_DISPLAY;
    this._startRound(0);
  }

  /**
   * Main advance method — called on Enter/Next click
   * Only acts on phases where user input is expected
   */
  async advance() {
    if (this._busy) return;

    if (this.phase === PHASES.IMAGE_DISPLAY) {
      await this._runRevealSequence();
    } else if (this.phase === PHASES.COUNTRY_REVEAL) {
      await this._advanceToNextRound();
    }
    // All other phases are auto-running, ignore input
  }

  /**
   * Set up a round: update UI, show image
   */
  _startRound(index) {
    const round = this.rounds[index];
    this.ui.updateProgressDots(index, this.rounds.length);
    this.ui.setRoundImage(round.imageFile, round.imageCaption);
    this.ui.hideReveal();
    this.ui.showNextButton();
    this.ui.setPhaseClass(PHASES.IMAGE_DISPLAY);
    this.phase = PHASES.IMAGE_DISPLAY;
  }

  /**
   * Full reveal sequence: image out → globe rise → spin → settle → reveal
   */
  async _runRevealSequence() {
    this._busy = true;
    const round = this.rounds[this.currentRoundIndex];

    // 1. Hide next button during animation
    this.ui.hideNextButton();

    // 2. IMAGE_EXIT — slide image up
    this.phase = PHASES.IMAGE_EXIT;
    this.ui.setPhaseClass(PHASES.IMAGE_EXIT);
    await this.animationController.slideImageOut();

    // 3. GLOBE_ENTER — rise globe
    this.phase = PHASES.GLOBE_ENTER;
    this.ui.setPhaseClass(PHASES.GLOBE_ENTER);
    await this.animationController.riseGlobe();

    // Small pause for drama
    await this._wait(200);

    // 4. GLOBE_SPINNING — dramatic spin
    this.phase = PHASES.GLOBE_SPINNING;
    this.ui.setPhaseClass(PHASES.GLOBE_SPINNING);
    await this.globeManager.dramaticSpin(3200);

    // 5. GLOBE_SETTLING — fly to country
    this.phase = PHASES.GLOBE_SETTLING;
    this.ui.setPhaseClass(PHASES.GLOBE_SETTLING);
    await this.globeManager.settleOnCountry(round);

    // Small pause before reveal
    await this._wait(400);

    // 6. COUNTRY_REVEAL — show label
    this.phase = PHASES.COUNTRY_REVEAL;
    this.ui.setPhaseClass(PHASES.COUNTRY_REVEAL);
    this.ui.showReveal(round.countryName, round.flagEmoji, round.funFact);
    this.ui.showNextButton();

    this._busy = false;
  }

  /**
   * Advance to the next round (or game over)
   */
  async _advanceToNextRound() {
    this._busy = true;

    // Hide reveal
    this.ui.hideReveal();
    this.ui.hideNextButton();

    const isLastRound = this.currentRoundIndex >= this.rounds.length - 1;

    if (isLastRound) {
      // GAME OVER
      await this._wait(300);
      this.phase = PHASES.GAME_OVER;
      this.ui.setPhaseClass(PHASES.GAME_OVER);

      // Mark last dot as completed
      this.ui.updateProgressDots(this.rounds.length, this.rounds.length);

      this.ui.showGameOver(this.rounds);
      this._busy = false;
      return;
    }

    // Transition to next round
    await this.animationController.transitionToNextRound();

    // Reset globe
    this.globeManager.resetForNextRound();

    // Increment round
    this.currentRoundIndex++;

    // Reset image position
    this.animationController.resetImage();

    // Small pause
    await this._wait(300);

    // Start next round
    this._startRound(this.currentRoundIndex);

    this._busy = false;
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentRound() {
    return this.rounds[this.currentRoundIndex];
  }

  getPhase() {
    return this.phase;
  }
}
