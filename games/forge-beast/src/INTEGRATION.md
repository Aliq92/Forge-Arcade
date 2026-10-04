# Forge Arcade integration — V0.5.1

Forge Beast remains an independent TypeScript/Vite module. No gameplay systems or content were added. The game imports its own namespaced stylesheet; **do not import `src/host.css` into Forge Arcade**. That file belongs only to the standalone bootstrap.

## Minimal host

```ts
import { createForgeBeast, FORGE_BEAST_METADATA } from './games/forge-beast';

const game = createForgeBeast({
  mode: 'embedded',
  saveKey: 'forge-arcade:player-1:forge-beast',
  onEvent(event) {
    if (event.type === 'exit-requested') closeGamePanel();
    if (event.type === 'error') console.error(event.payload);
  },
});

game.mount(document.querySelector<HTMLElement>('#game-viewport')!);
game.pause();
game.resume();
const saved = game.save(); // boolean; false means progress was not persisted.
const tile = game.getStateSummary();
game.requestExit(); // Notification only. The host chooses navigation and cleanup.
game.unmount();    // Save, release DOM/listeners/timers/audio; instance can be reused.
game.mount(document.querySelector<HTMLElement>('#game-viewport')!);
game.destroy();    // Final cleanup; create a fresh instance afterwards.
```

Use a dedicated container whose children the game may own. Keep the container's own positioning, size and classes under host control. Example host CSS:

```css
#game-viewport {
  width: 100%;
  height: 580px; /* Or a bounded height from your flex/grid layout. */
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
```

A bounded height is required for predictable embedded fitting. The device centers and scales uniformly within the container; a ResizeObserver watches both the container and device. The existing compact portrait dimensions are shared with mobile presentation. Verified panels include 280×480, 320×568, 360×580, 412×700 and 600×430; A/B/C targets remain at least 44px. Extremely small panels scale further and cannot guarantee readable text or 44px targets. Prefer portrait; landscape is supported gracefully without forcing orientation APIs.

## Public lifecycle

| Method | Contract |
| --- | --- |
| `createForgeBeast(options?)` | Creates an instance and reads its save. No UI, running timer, observer or AudioContext is created until needed. |
| `mount(container)` | Mounts one device, attaches listeners/observer, saves and emits `ready`. Repeated mounting to the same container is a no-op. A second instance cannot take over an occupied game container. Unmount before changing containers. |
| `init()` | Compatibility API for `new ForgeBeastGame(container, options).init()`. |
| `pause()` | Retains the host's pause request across visibility changes. Cancels the clock interval, pauses CSS/Web Animations, stops scheduled tones, suspends the existing audio context, cancels vibration, saves, and blocks input. Idempotent. |
| `resume()` | Clears the host pause request. Starts at most one clock interval when mounted, visible and free of guide/reset/runtime pause. Resume itself is silent. |
| `save()` | Validates and immediately writes a complete snapshot. Returns boolean and emits `save`. Explicitly disabled storage returns false without a storage error. |
| `getStateSummary()` | Detached, frozen, qualitative launcher information. Safe while unmounted. |
| `reset(options?)` | Fresh egg; returns false and retains the beast when an enabled storage write fails. `{ keepSettings: true }` preserves mute/haptics, matching the confirmed player reset. The default retains the earlier full-reset API. |
| `requestExit()` | Emits `exit-requested`. Does not navigate, pause or unmount; the host decides. |
| `unmount()` | Saves once, stops timers/animations/feedback, disconnects observers, removes every owned event listener and DOM child, and releases container/view references. Reusable and idempotent. |
| `destroy()` | Terminal, idempotent teardown. Releases storage and host callback references. Mounting a destroyed instance throws a clear error. |
| `getState()` | Retained compatibility/debug API: detached full snapshot. Prefer the stable summary for launcher code. |

The host pause preference survives unmount/remount; call `resume()` when the host intends to play again. Reusing an instance preserves unsaved valid progress in memory after a storage failure. A new instance can recover only what the host storage successfully retained. Configuration is chosen at creation; create a new instance to change save slots/storage/options.

## Options and storage

`mode` is `'standalone'` (default) or `'embedded'`. Embedded mode hides standalone page chrome and fits the host container. The earlier `embedded: true` option remains supported; explicit `mode` wins. `debug` defaults to false and must be explicitly true. The game module never reads URL parameters; only the standalone bootstrap does. `saveKey` defaults to the existing `forge-arcade:forge-beast:v1`. Use distinct keys for independent slots. `storage: null` deliberately disables persistence.

The optional host adapter is **synchronous**:

```ts
import type { ForgeBeastStorage } from './games/forge-beast';
const storage: ForgeBeastStorage = {
  get: key => hostCache.get(key) ?? null,
  set: (key, value) => { hostCache.set(key, value); }, // Throw on failure.
  remove: key => { hostCache.delete(key); },
};
const game = createForgeBeast({ mode: 'embedded', storage, saveKey: 'beast-slot' });
```

The existing `getItem/setItem/removeItem` Storage-compatible adapter also works. Default storage is guarded `localStorage`. Async/cloud synchronization, conflict management and user identities belong to Forge Arcade; no backend or promises are introduced into the simulation.

## Host events

`onEvent(event)` receives a discriminated `{ type, payload }` union. Payloads are detached and never expose hidden formulas. Callback failures are caught, reported through an `error` event, and cannot break the host or recursively dispatch the same event type. State events are emitted only when the launcher summary changes. The older optional `onStateChange(snapshot)` callback remains available and is also isolated from callback exceptions.

| Type | Payload |
| --- | --- |
| `ready` | Launcher summary, once per successful mount |
| `save` | `{ success, summary }` |
| `pause`, `resume` | `{ reason }`, only on an actual running-state transition |
| `game-state-change` | Qualitative launcher summary |
| `creature-evolved` | `{ species, creatureName }` |
| `battle-won`, `battle-lost` | `{ opponent, turns, rare }` |
| `rare-discovery` | `{ source: 'expedition' \| 'battle', id }` |
| `reset`, `exit-requested` | Launcher summary |
| `error` | `{ subsystem, message, recoverable }` |

Existing victories/discoveries are not re-emitted on remount. Host events are local notifications, not durable achievements, analytics or a guaranteed-delivery queue. Evolution/discovery observation records only identifiers and counters, not duplicate full game states.

## Launcher entry and metadata

```ts
// This entry imports no rendering code, stylesheet, timers, audio or DOM globals.
import { readForgeBeastSummary, FORGE_BEAST_METADATA } from './games/forge-beast/launcher';
const summary = readForgeBeastSummary({ storage, saveKey: 'beast-slot' });
```

Reading a tile does not write, migrate-in-place or overwrite the save. `getStateSummary()` and `readForgeBeastSummary()` return `gameId`, `displayName`, `hasSave`, `creatureName`, `species`, `lifeStage`, `hungerState`, `moodState`, `energyState`, `healthState`, `sleeping`, `attentionNeeded`, `activeExpedition`, `activeBattle`, `pendingEncounter`, and `lastPlayedAt`. Missing saves have null creature/timestamp fields. `activeBattle` means ongoing combat; a saved result is not an active fight. `lastPlayedAt` is the last successful save timestamp, not the host's launcher-open time.

Metadata exports: `id: 'forge-beast'`, `title: 'Forge Beast'`, `version: '0.5.1'`, `orientation: 'portrait'`, `category: 'virtual-pet'`, `supportsPause: true`, `supportsPersistentSave: true`, short `description`, `minimumViewport: { width: 280, height: 480 }`, and `preferredAspectRatio: '320 / 568'`. Metadata is frozen and independent of launcher UI. Save schema `SAVE_VERSION = 2` is a separate central constant; it is deliberately unchanged because V0.5.1 adds no required persistent gameplay fields.

## Time, expeditions and combat

V0.5 active-time behavior is preserved: **no care decay, age, expedition progression, battle feedback or event simulation occurs while paused, hidden or unmounted**. Resume resets the monotonic clock baseline and excludes elapsed wall time. A 20-minute pause does not simulate 20 minutes of neglect or expedition activity. No offline simulation was added to this integration release. Saved wall timestamps remain available for a future explicit policy.

Active expeditions retain their start wall timestamp, start/end active ages and reserved energy cost. Re-entry resumes the remaining active duration without a second departure charge. Completion, inventory changes, discovery records and the pending result commit in one snapshot. Repeated open/close cycles cannot duplicate completion or rewards.

Battles use **resumable state**. A turn is already resolved atomically before its feedback sequence. Re-entry retains resolved HP, stamina, initiative state, turn count and result; old animation beats are cleared and damage/rewards are not replayed. Pausing without unmounting freezes the current feedback phase and resumes it. The host must call unmount/destroy rather than merely remove the container from the document.

## Save protection and recovery

V0.1 migration and its original `:backup:v1` backup remain. V0.2–V0.5 compatible schema-2 saves gain only absent fields; existing species, needs, personality, histories, inventory, expeditions and combat survive. Present invalid values are rejected instead of silently converted. Missing compatible stat/counter/need timer/preferences fields get bounded defaults. Schema validation runs on load and before every write.

Malformed or unsupported future saves are preserved byte-for-byte. Automatic saves are blocked; the UI reports unavailable storage and the host receives an error. A valid legacy backup can supply a temporary recovered state, while the damaged primary stays protected. An explicit player/API reset must first retain the raw payload in `:backup:invalid` before replacing it. Failed writes never claim a successful save timestamp. Future schema versions require an explicit migration; they are never guessed or silently downgraded.

Noncritical audio/haptics failure cannot stop play. Audio remains muteable and cannot create a context until player interaction unlocks it; each mount re-locks automatic feedback. Pausing cancels tones/vibration, and unmount closes the context. Runtime rendering/input/simulation errors stop activity, preserve a validated save, report an error and show a reopen message. Remount recovers from the last valid persisted state. Serious errors are logged rather than hidden.

## Isolation and sandbox

The module has only `.forge-beast` selectors and `fb-` animation names. Its scoped HTML reset protects against common host tag rules and never applies to body/html. Host selectors explicitly targeting game internals, inline styles or `!important` can still override the game; this is ordinary CSS isolation, not a Shadow DOM security boundary. There are no game-owned route changes, history handlers or orientation locks. The standalone brand now requests host exit instead of navigating a hash link.

Run `npm run dev`, then open `/?integrationDemo=1`. The sandbox uses `forge-arcade:integration-demo:forge-beast`, never the normal creature slot. It exercises mount/pause/resume/save/summary/exit/unmount/remount and container resizing. Debug tools require its explicit checkbox plus Remount; `debug=1` in that URL alone cannot enable them. This is a development harness, not Forge Arcade.

Tests cover original gameplay plus schema compatibility, malformed save preservation, host storage/events, UI-free summaries, clock/audio/haptic pause, 12 repeated lifecycle cycles with timer/listener/observer/context counters, expedition/battle remounts, standalone layout, constrained embedded panels and parent routing/styles. Call unmount/destroy on every host exit and dispose instances when switching users or save slots. Concurrent tabs/instances sharing a save key are not synchronized; the host should ensure one writer per slot.
