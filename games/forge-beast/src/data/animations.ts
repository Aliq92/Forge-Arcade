export const ACTION_ANIMATIONS = ['feed', 'train', 'play', 'sleep', 'wake', 'evolution', 'depart', 'discover', 'rare', 'failure'] as const;
export type AnimationKind = typeof ACTION_ANIMATIONS[number];
export interface AnimationPhase { name: string; duration: number }
export const ANIMATIONS: Record<AnimationKind, readonly AnimationPhase[]> = {
  depart: [{ name: 'leave', duration: 1.2 }],
  discover: [{ name: 'return', duration: 1.1 }, { name: 'success', duration: 2 }],
  rare: [{ name: 'return', duration: 1.1 }, { name: 'rare', duration: 2 }],
  failure: [{ name: 'return', duration: 1.1 }, { name: 'failure', duration: 2 }],
  feed: [{ name: 'approach', duration: .45 }, { name: 'chew', duration: 1.15 }, { name: 'finish', duration: 1 }],
  train: [{ name: 'exercise', duration: 1.2 }, { name: 'exert', duration: .6 }, { name: 'finish', duration: .8 }],
  play: [{ name: 'chase', duration: .45 }, { name: 'bounce', duration: 1.3 }, { name: 'joy', duration: .85 }],
  sleep: [{ name: 'settle', duration: .7 }, { name: 'drowse', duration: .8 }],
  wake: [{ name: 'rise', duration: .6 }, { name: 'stretch', duration: .8 }, { name: 'alert', duration: .8 }],
  evolution: [{ name: 'glow', duration: .4 }, { name: 'reveal', duration: 1 }, { name: 'celebrate', duration: 1.2 }],
};
