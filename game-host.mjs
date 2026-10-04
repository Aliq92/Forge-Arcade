/** Small adapter for the Arcade's native game pages; it never owns game state. */
export class ArcadeGameHost {
  constructor({ container, load, options = {}, onExit, onError = console.error, document: doc = globalThis.document }) {
    this.container = container;
    this.load = load;
    this.options = options;
    this.onExit = onExit;
    this.onError = onError;
    this.document = doc;
    this.game = null;
    this.closed = false;
    this.userPaused = false;
    this.opening = null;
    this.onVisibility = () => this.syncPause();
    this.onHostEvent = event => {
      if (this.closed) return;
      const callback = this.options.onEvent;
      if (event.type === 'exit-requested') this.exit();
      else if (event.type === 'error') this.onError(event.payload, false);
      callback?.(event);
    };
  }
  open() {
    if (this.closed) return Promise.reject(new Error('Game host is closed.'));
    if (this.opening) return this.opening;
    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.opening = Promise.resolve().then(() => this.closed ? null : this.load()).then(module => {
      if (this.closed) return;
      this.game = module.createForgeBeast({ ...this.options, mode: 'embedded', debug: this.options.debug === true, onEvent: this.onHostEvent });
      // Pause before mounting to avoid even one hidden tick.
      if (this.userPaused || this.document.hidden) this.game.pause();
      this.game.mount(this.container);
      this.syncPause();
      return this.game.getStateSummary();
    }).catch(error => {
      if (this.closed) return;
      this.close();
      this.onError(error, true);
    });
    return this.opening;
  }
  syncPause() {
    if (this.closed || !this.game) return;
    if (this.userPaused || this.document.hidden) this.game.pause();
    else this.game.resume();
  }
  pause() { this.userPaused = true; this.syncPause(); }
  resume() { this.userPaused = false; this.syncPause(); }
  save() { return this.game?.save() ?? false; }
  getStateSummary() { return this.game?.getStateSummary() ?? null; }
  exit() { if (this.closed) return; this.close(); this.onExit?.(); }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.document.removeEventListener('visibilitychange', this.onVisibility);
    try { this.game?.save(); }
    catch (error) { this.onError(error, false); }
    finally {
      try { this.game?.destroy(); } catch (error) { this.onError(error, false); }
      this.game = null;
      this.container = null;
      this.load = null;
      this.options = {};
    }
  }
}
