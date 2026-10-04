/** Short UI-only motion, independent of the creature's simulation timeline. */
export class MotionSystem {
  private paused = false;
  private animations = new Set<Animation>();
  play(element: HTMLElement, effect: 'confirm' | 'appear' | 'page') {
    if (this.paused || typeof element.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frames = effect === 'confirm'
      ? [{ filter: 'brightness(1.06)' }, { filter: 'brightness(1)' }]
      : effect === 'page'
        ? [{ opacity: .4, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }]
        : [{ opacity: .35 }, { opacity: 1 }];
    const animation = element.animate(frames, { duration: effect === 'page' ? 160 : 180, easing: 'ease-out' });
    this.animations.add(animation);
    animation.onfinish = animation.oncancel = () => this.animations.delete(animation);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    for (const animation of this.animations) { if (paused) animation.pause(); else animation.play(); }
  }
  destroy() { for (const animation of this.animations) animation.cancel(); this.animations.clear(); }
}
