import type { SpeciesId } from '../creatures/Creature';
export interface SkillDefinition {
  name: string; cost: number; power: number; powerRange?: number;
  priority: number; shield: number; dodge: number; description: string;
}
export const SKILLS: Record<Exclude<SpeciesId, 'cinder-egg'>, SkillDefinition> = {
  pipkin: { name: 'Spark Tap', cost: 3, power: 1.15, priority: 0, shield: 0, dodge: 0, description: 'A tiny spark. A brave first trick.' },
  cragox: { name: 'Crag Crash', cost: 6, power: 1.55, priority: 0, shield: 0, dodge: 0, description: 'A heavy stomp against the trail.' },
  zephlet: { name: 'Windskip', cost: 5, power: 1.3, priority: 3, shield: 0, dodge: .18, description: 'A swift strike and a nimble step.' },
  runewisp: { name: 'Rune Veil', cost: 5, power: 1.3, priority: 0, shield: .3, dodge: 0, description: 'A bright pulse; a veil softens one hit.' },
  bramblejaw: { name: 'Briar Burst', cost: 5, power: 1.15, powerRange: .5, priority: 0, shield: 0, dodge: 0, description: 'An untamed burst of thicket sparks.' },
};
