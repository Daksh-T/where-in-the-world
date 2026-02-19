/**
 * AnimationController — GSAP-powered DOM transitions
 * Handles image slide-out and globe rise animations.
 *
 * HTML structure:
 *   .globe-wrapper#globeOuter   ← fixed centering anchor, never moves
 *     .globe-slider#globeWrapper ← GSAP animates this vertically
 *       .globe-container#globeContainer
 *
 * The slider starts at translateY(sliderHeight - peekHeight) via CSS,
 * so only peekHeight px of the globe is visible above the bottom edge.
 * To fully reveal the globe, GSAP animates it to translateY(0).
 */

import { gsap } from 'gsap';

export class AnimationController {
  constructor(imageContainerEl, globeSliderEl) {
    this.imageContainer = imageContainerEl;
    this.globeSlider    = globeSliderEl; // the #globeWrapper (.globe-slider) element
  }

  /**
   * Slide the image container up and off screen
   */
  slideImageOut() {
    return new Promise(resolve => {
      gsap.to(this.imageContainer, {
        y: '-110vh',
        opacity: 0,
        duration: 0.75,
        ease: 'power2.in',
        onComplete: resolve
      });
    });
  }

  /**
   * Rise the globe slider from its peeking position to fully visible.
   * CSS sets the initial transform to translateY(sliderHeight - peekHeight).
   * GSAP animates it to translateY(0) — i.e. y: 0.
   *
   * We use gsap.fromTo so it always starts from the correct hidden position,
   * regardless of any previous GSAP state.
   */
  riseGlobe() {
    return new Promise(resolve => {
      const peekHeight   = this._getPeekHeight();
      const sliderHeight = this.globeSlider.offsetHeight || 700;
      const hiddenAmount = sliderHeight - peekHeight;

      // fromTo: start at hidden position, animate to fully visible (y=0)
      gsap.fromTo(this.globeSlider,
        { y: hiddenAmount },
        {
          y: 0,
          duration: 1.1,
          ease: 'back.out(1.1)',
          onComplete: resolve
        }
      );
    });
  }

  /**
   * Reset image container position instantly (for next round)
   */
  resetImage() {
    gsap.set(this.imageContainer, { y: 0, opacity: 1 });
  }

  /**
   * Reset globe slider to its hidden/peeking position instantly
   */
  hideGlobe() {
    const peekHeight   = this._getPeekHeight();
    const sliderHeight = this.globeSlider.offsetHeight || 700;
    const hiddenAmount = sliderHeight - peekHeight;
    gsap.set(this.globeSlider, { y: hiddenAmount });
  }

  /**
   * Transition between rounds: slide globe back down, then image comes in
   */
  async transitionToNextRound() {
    const peekHeight   = this._getPeekHeight();
    const sliderHeight = this.globeSlider.offsetHeight || 700;
    const hiddenAmount = sliderHeight - peekHeight;

    await new Promise(resolve => {
      gsap.to(this.globeSlider, {
        y: hiddenAmount,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: resolve
      });
    });
  }

  _getPeekHeight() {
    return parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--globe-peek-height')
    ) || 140;
  }
}
