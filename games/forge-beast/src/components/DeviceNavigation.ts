import { ZONE_IDS, type ZoneId } from '../data/expeditions';
import { ITEM_IDS, type ItemId } from '../data/items';
import type { ExpeditionPage } from './ExplorationView';
import type { CareAction } from '../systems/Actions';
import { ResetFlow } from '../systems/ResetFlow';
import { LOG_PAGE, SETTINGS_PAGE, STATUS_PAGES } from './StatusView';
export const MENU = ['feed', 'train', 'play', 'sleep', 'status', 'explore', 'items'] as const;
export const SETTINGS = ['Sound', 'Haptics', 'Start new egg'] as const;
export type ButtonInput = 'select' | 'confirm' | 'back';
export type NavigationResult = { action?: CareAction; toggle?: 'sound' | 'haptics'; reset?: boolean; hint?: boolean; explore?: ZoneId; item?: ItemId; acknowledge?: boolean };
/** Navigation only; never changes creature state or storage. */
export class DeviceNavigation {
  selected = 0;
  expeditionPage: ExpeditionPage = null;
  zoneIndex = 0;
  inventoryOpen = false;
  itemIndex = 0;
  itemConfirm = false;
  statusPage: number | null = null;
  logOffset = 0;
  settingIndex = 0;
  resetFlow = new ResetFlow();
  press(input: ButtonInput, historyLength: number, exploring = false): NavigationResult {
    if (this.resetFlow.pending) {
      if (input === 'select') this.resetFlow.select();
      if (input === 'back') this.resetFlow.cancel();
      if (input === 'confirm') return { reset: this.resetFlow.confirm() === 'reset' };
      return {};
    }
    if (this.expeditionPage) {
      if (this.expeditionPage === 'result') return { acknowledge: input !== 'select' };
      if (this.expeditionPage === 'trip') { if (input !== 'select') this.expeditionPage = null; return {}; }
      if (input === 'back') this.expeditionPage = this.expeditionPage === 'confirm' ? 'zones' : null;
      if (input === 'select') { this.zoneIndex = (this.zoneIndex + 1) % ZONE_IDS.length; this.expeditionPage = 'zones'; }
      if (input === 'confirm') {
        if (this.expeditionPage === 'confirm') return { explore: ZONE_IDS[this.zoneIndex] };
        this.expeditionPage = 'confirm';
      }
      return {};
    }
    if (this.inventoryOpen) {
      if (input === 'back') { if (this.itemConfirm) this.itemConfirm = false; else this.inventoryOpen = false; }
      if (input === 'select') { this.itemIndex = (this.itemIndex + 1) % ITEM_IDS.length; this.itemConfirm = false; }
      if (input === 'confirm') {
        if (this.itemConfirm) return { item: ITEM_IDS[this.itemIndex] };
        this.itemConfirm = true;
      }
      return {};
    }
    if (input === 'back') {
      if (this.statusPage !== null) this.statusPage = null;
      else { this.selected = 0; return { hint: true }; }
      return {};
    }
    if (input === 'select') {
      if (this.statusPage === SETTINGS_PAGE) this.settingIndex = (this.settingIndex + 1) % SETTINGS.length;
      else if (this.statusPage !== null) { this.statusPage = (this.statusPage + 1) % STATUS_PAGES.length; this.logOffset = 0; }
      else this.selected = (this.selected + 1) % MENU.length;
      return {};
    }
    if (this.statusPage === SETTINGS_PAGE) {
      if (this.settingIndex === 2) this.resetFlow.begin();
      else return { toggle: this.settingIndex === 0 ? 'sound' : 'haptics' };
    } else if (this.statusPage === LOG_PAGE) this.logOffset = (this.logOffset + 1) % Math.max(1, historyLength);
    else if (this.statusPage === 3) return { toggle: 'sound' };
    else if (this.statusPage !== null) this.statusPage = (this.statusPage + 1) % STATUS_PAGES.length;
    else if (MENU[this.selected] === 'status') this.statusPage = 0;
    else if (MENU[this.selected] === 'explore') this.expeditionPage = exploring ? 'trip' : 'zones';
    else if (MENU[this.selected] === 'items') this.inventoryOpen = true;
    else return { action: MENU[this.selected] as CareAction };
    return {};
  }
  openReset() { this.expeditionPage = null; this.inventoryOpen = false; this.statusPage = SETTINGS_PAGE; this.settingIndex = 2; this.resetFlow.begin(); }
  reset() { this.expeditionPage = null; this.inventoryOpen = false; this.itemConfirm = false; this.zoneIndex = 0; this.itemIndex = 0; this.selected = 0; this.statusPage = null; this.logOffset = 0; this.settingIndex = 0; this.resetFlow.cancel(); }
}
