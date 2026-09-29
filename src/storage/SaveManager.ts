import { STORAGE_KEY } from '../core/constants';
export class SaveManager {
  getHighScore():number { try { return Number(localStorage.getItem(STORAGE_KEY) ?? 0) || 0; } catch { return 0; } }
  setHighScore(value:number):void { try { localStorage.setItem(STORAGE_KEY,String(value)); } catch { /* storage may be unavailable in private mode */ } }
  getMuted():boolean { try { return localStorage.getItem('voidRunnerMuted') === '1'; } catch { return false; } }
  setMuted(value:boolean):void { try { localStorage.setItem('voidRunnerMuted',value?'1':'0'); } catch { /* ignore */ } }
}
