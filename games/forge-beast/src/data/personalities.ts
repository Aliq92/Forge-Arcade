export const PERSONALITY_IDS = ['bold', 'calm', 'curious', 'stubborn', 'playful'] as const;
export type PersonalityId = typeof PERSONALITY_IDS[number];
export type EvolutionAffinity = 'brute' | 'agile' | 'mystic' | 'wild';
export interface PersonalityProfile {
  name: string;
  decay: { hunger: number; energy: number; mood: number; discipline: number };
  trainingMood: number;
  trainingEnergy: number;
  playMood: number;
  playEnergy: number;
  sleepRecovery: number;
  refusalChance: number;
  eventChance: number;
  eventWeights: Partial<Record<string, number>>;
  affinity: EvolutionAffinity;
  trainText: string;
  playText: string;
  sleepText: string;
}
export const PERSONALITIES: Record<PersonalityId, PersonalityProfile> = {
  bold: {
    name: 'Bold', decay: { hunger: 1.15, energy: 1.1, mood: 0.95, discipline: 0.8 },
    trainingMood: 5, trainingEnergy: 11, playMood: 17, playEnergy: 8, sleepRecovery: 1.05,
    refusalChance: 0.15, eventChance: 0.5, eventWeights: { excited: 2, restless: 1.5 }, affinity: 'brute',
    trainText: 'Little steps. Ready for the next challenge!', playText: 'A daring little leap. Again!', sleepText: 'One last stretch, then dreams…',
  },
  calm: {
    name: 'Calm', decay: { hunger: 0.9, energy: 0.85, mood: 0.75, discipline: 0.8 },
    trainingMood: 2, trainingEnergy: 10, playMood: 16, playEnergy: 6, sleepRecovery: 1.1,
    refusalChance: 0.1, eventChance: 0.35, eventWeights: { oversleeps: 3, 'wakes-early': 0.25 }, affinity: 'mystic',
    trainText: 'Little steps. Quietly getting stronger.', playText: 'A gentle game. A contented chirp.', sleepText: 'Settling into a cozy little dream…',
  },
  curious: {
    name: 'Curious', decay: { hunger: 1.05, energy: 1.05, mood: 1.1, discipline: 1 },
    trainingMood: 3, trainingEnergy: 12, playMood: 19, playEnergy: 7, sleepRecovery: 1,
    refusalChance: 0.2, eventChance: 0.55, eventWeights: { 'found-object': 3, restless: 1.5 }, affinity: 'agile',
    trainText: 'Little steps. Trying a new little trick!', playText: 'What happens if…? A happy discovery!', sleepText: 'Dreaming up the next discovery…',
  },
  stubborn: {
    name: 'Stubborn', decay: { hunger: 1, energy: 1, mood: 1.15, discipline: 1.2 },
    trainingMood: 1, trainingEnergy: 12, playMood: 16, playEnergy: 7, sleepRecovery: 0.9,
    refusalChance: 0.7, eventChance: 0.45, eventWeights: { restless: 2, 'wakes-early': 2 }, affinity: 'wild',
    trainText: 'Little steps. On their own terms.', playText: 'Pretending not to enjoy it. A tiny grin.', sleepText: 'Not sleepy… just resting those eyes.',
  },
  playful: {
    name: 'Playful', decay: { hunger: 1.1, energy: 1.15, mood: 1.2, discipline: 1.1 },
    trainingMood: 3, trainingEnergy: 12, playMood: 23, playEnergy: 8, sleepRecovery: 1,
    refusalChance: 0.25, eventChance: 0.6, eventWeights: { excited: 3, lonely: 1.5 }, affinity: 'agile',
    trainText: 'Little steps. Turning practice into a game!', playText: 'A little play. A whole lot of happy hops!', sleepText: 'Even little whirlwinds need a nap…',
  },
};
