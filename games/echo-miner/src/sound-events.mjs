import { SOUND } from './config.mjs';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createSoundEvent(position, strength, time, kind) {
  return { position: { x: position.x, y: position.y }, strength, time, kind };
}

/** Score a single event's contribution to a listener at `hunter.position`, at time `now`. */
export function scoreSound(event, hunter, now) {
  const age = now - event.time;
  if (age < 0 || age > SOUND.lifetimeSeconds) return 0;
  const ageFalloff = 1 - age / SOUND.lifetimeSeconds;

  const maxRange = SOUND.maxRange[event.kind] ?? SOUND.maxRange.sonar;
  const dist = distance(event.position, hunter.position);
  if (dist > maxRange) return 0;
  const distanceFalloff = 1 - dist / maxRange;

  return event.strength * distanceFalloff * ageFalloff;
}

/**
 * Aggregate awareness contribution from a list of sound events, including a
 * capped repetition bonus for sonar pings that repeat within
 * SOUND.repetitionRadius / SOUND.repetitionWindowSeconds of one another.
 */
export function scoreSoundEvents(events, hunter, now) {
  let total = 0;
  for (const event of events) total += scoreSound(event, hunter, now);

  const recentSonar = events.filter(
    (e) => e.kind === 'sonar' && now - e.time >= 0 && now - e.time <= SOUND.lifetimeSeconds,
  );

  let repetitionBonus = 0;
  for (let i = 0; i < recentSonar.length; i += 1) {
    for (let j = i + 1; j < recentSonar.length; j += 1) {
      const a = recentSonar[i];
      const b = recentSonar[j];
      if (Math.abs(a.time - b.time) > SOUND.repetitionWindowSeconds) continue;
      if (distance(a.position, b.position) > SOUND.repetitionRadius) continue;
      repetitionBonus += SOUND.repetitionBonus;
    }
  }
  repetitionBonus = Math.min(SOUND.repetitionBonusCap, repetitionBonus);

  return total + (recentSonar.length > 0 ? repetitionBonus : 0);
}

