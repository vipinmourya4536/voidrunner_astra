import type { Tone } from './music';

interface ShipSound {
  freq: number; range: number; type: OscillatorType; dur: number; vol: number;
  rate: number; freq2: number; type2: OscillatorType;
}
export const SHIP_SOUNDS: readonly ShipSound[] = [
  { freq: 240, range: 50, type: 'sine', dur: .07, vol: .025, rate: 6, freq2: 350, type2: 'sine' },
  { freq: 420, range: 80, type: 'sawtooth', dur: .035, vol: .016, rate: 4, freq2: 630, type2: 'sawtooth' },
  { freq: 130, range: 50, type: 'triangle', dur: .12, vol: .03, rate: 9, freq2: 195, type2: 'sine' },
  { freq: 360, range: 55, type: 'triangle', dur: .045, vol: .022, rate: 4, freq2: 620, type2: 'sine' },
  { freq: 190, range: 36, type: 'sine', dur: .09, vol: .026, rate: 6, freq2: 380, type2: 'triangle' },
  { freq: 170, range: 28, type: 'triangle', dur: .08, vol: .022, rate: 7, freq2: 230, type2: 'sine' },
  { freq: 310, range: 34, type: 'sine', dur: .07, vol: .020, rate: 7, freq2: 510, type2: 'triangle' },
  { freq: 440, range: 48, type: 'sawtooth', dur: .045, vol: .018, rate: 5, freq2: 670, type2: 'sine' },
];
const NITRO: [number, OscillatorType, number, number][] = [
  [500, 'sine', .04, .015], [800, 'sawtooth', .03, .012],
  [250, 'triangle', .06, .02], [620, 'sine', .04, .018], [340, 'triangle', .06, .022], [180, 'triangle', .08, .02], [700, 'sine', .05, .018], [520, 'sawtooth', .045, .016],
];

export const effectTone = (frequency: number, type: OscillatorType, duration: number, volume = .1): Tone =>
  ({ frequency, type, duration, volume, endVolume: .01 });

export function thrustNotes(ship: number, random: () => number): Tone[] {
  const s = SHIP_SOUNDS[ship] ?? SHIP_SOUNDS[0];
  const notes = [effectTone(s.freq + random() * s.range, s.type, s.dur, s.vol)];
  if (random() > .55) notes.push(effectTone(s.freq2 + random() * s.range * .4, s.type2, s.dur * .6, s.vol * .35));
  return notes;
}

export function nitroNote(ship: number, random: () => number): Tone {
  const [freq, type, duration, volume] = NITRO[ship] ?? NITRO[0];
  return effectTone(freq + random() * 60, type, duration, volume);
}

export function pickupNotes(kind: 'shield' | 'corridor'): Tone[] {
  return kind === 'shield'
    ? [effectTone(600, 'sine', .15, .08), effectTone(900, 'sine', .12, .06), effectTone(1200, 'triangle', .2, .04)]
    : [effectTone(500, 'triangle', .15, .07), effectTone(700, 'sine', .12, .05), effectTone(1000, 'triangle', .18, .04)];
}

export function deathNotes(ship: number): Tone[] {
  const [a, b] = [[150, 80], [200, 120], [100, 60], [260, 130], [170, 90], [120, 70], [210, 110], [270, 140]][ship] ?? [150, 80];
  return [effectTone(a, 'sawtooth', .4, .2), effectTone(b, 'sawtooth', .8, .2)];
}

export const SHIELD_BREAK = [effectTone(800, 'sine', .1, .12), effectTone(400, 'triangle', .2, .08), effectTone(200, 'sawtooth', .15, .06)];
export const CORRIDOR_ACTIVATE = [effectTone(300, 'sine', .2, .08), effectTone(500, 'triangle', .15, .06)];
export const SHIELD_EXPIRE = [effectTone(400, 'sine', .2, .04), effectTone(200, 'sine', .3, .03)];
export const CORRIDOR_EXPIRE = [effectTone(200, 'sine', .2, .04)];
export const sectorNotes = (sector: number): Tone[] => [effectTone(300 + sector * 50, 'sine', .3, .06), effectTone(450 + sector * 30, 'triangle', .2, .04)];
