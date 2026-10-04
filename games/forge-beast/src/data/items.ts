import type { Stats } from '../creatures/Creature';
export const ITEM_IDS = ['snack', 'energy-berry', 'training-chip', 'toy', 'medicine', 'strange-fragment'] as const;
export type ItemId = typeof ITEM_IDS[number];
export interface ItemDefinition {
  name: string;
  description: string;
  effects: Partial<Stats>;
  consumable: boolean;
  reaction: 'feed' | 'train' | 'play' | 'happy' | 'excited';
  message: string;
}
export const ITEMS: Record<ItemId, ItemDefinition> = {
  snack: { name: 'Snack', description: 'A little bite for a hungry belly.', effects: { hunger: 20 }, consumable: true, reaction: 'feed', message: '{name} enjoyed a trail snack.' },
  'energy-berry': { name: 'Energy Berry', description: 'A bright berry to restore energy.', effects: { energy: 22 }, consumable: true, reaction: 'happy', message: '{name} perked up with an Energy Berry.' },
  'training-chip': { name: 'Training Chip', description: 'A tiny pattern for a new exercise.', effects: { training: 6, discipline: 3 }, consumable: true, reaction: 'train', message: '{name} learned a trick from a Training Chip.' },
  toy: { name: 'Toy', description: 'A springy trinket. A happy moment.', effects: { mood: 22 }, consumable: true, reaction: 'play', message: '{name} bounced a Toy with a little grin.' },
  medicine: { name: 'Medicine', description: 'Gentle care for a poorly beast.', effects: { health: 25 }, consumable: true, reaction: 'happy', message: '{name} feels better after Medicine.' },
  'strange-fragment': { name: 'Strange Fragment', description: 'Warm in your palm. What could it mean?', effects: {}, consumable: false, reaction: 'excited', message: '{name} studied a Strange Fragment. A quiet glow…' },
};
export const MAX_ITEM_QUANTITY = 99;
