/** Procedural score transcribed from reference/ship.html, BIOME_MUSIC. Times are seconds. */
export interface Tone {
  frequency: number;
  type: OscillatorType;
  duration: number;
  volume: number;
  endVolume: number;
  sweep?: { frequency: number; duration: number };
}

export const MUSIC_INTERVALS = [.3, .2, .15, .25, .22, .35, .13, .1, .27, .125, .4, .11] as const;
const VOID = [220, 0, 0, 330, 0, 165, 0, 0, 275, 0, 0, 0];
const NEBULA = [261.6, 329.6, 392, 493.9, 392, 329.6, 261.6, 220];
const ION_BASS = [55, 55, 82, 55, 110, 55, 73, 55];
const ION_MELODY = [440, 0, 660, 0, 550, 0, 440, 880];
const CRYSTAL = [523, 659, 784, 1047, 784, 659, 523, 440, 494, 659, 880, 659];
const SINGULARITY = [36, 37, 36, 38, 36, 0, 36, 40];
const STABS = [0, 311, 0, 0, 370, 0, 0, 277];
const GRAVITY = [41, 41, 41, 55, 41, 41, 55, 41];
const RHYTHM = [1, 0, 1, 1, 0, 1, 0, 1];
const PLUCKS = [0, 330, 0, 440, 0, 0, 370, 0];
const PLASMA = [880, 1108, 1320, 1760, 1320, 1108, 880, 660, 880, 1108, 1661, 1108];
const FRACTURE = [196, 220, 246, 220, 196, 174, 196, 220];
const METEOR = [55, 55, 73, 55, 82, 55, 73, 82];
const ACCENTS = [880, 0, 1320, 880, 0, 1108, 0, 880];
const COSMIC: [number, OscillatorType][] = [[55, 'sawtooth'], [330, 'square'], [660, 'triangle'], [110, 'sawtooth'], [440, 'square'], [880, 'triangle']];
const ASCENSION = [220, 277, 330, 415, 330, 277, 220, 185];

/** Audio-only PRNG. Never consumes gameplay randomness. */
export function audioRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function normalizeBiome(index: number): number {
  return Number.isFinite(index) ? ((Math.trunc(index) % 13) + 13) % 13 : 0;
}

/** Ascension plays immediately; all fixed-tempo source intervals wait one beat. */
export function firstNoteDelay(biome: number): number {
  return biome === 12 ? 0 : MUSIC_INTERVALS[biome];
}

/** Delay AFTER this note: source increments BPM before scheduling the next callback. */
export function nextNoteDelay(biome: number, step: number): number {
  return biome === 12 ? 60 / Math.min(180, 60 + (step + 1) * .15) : MUSIC_INTERVALS[biome];
}

export function musicNotes(biome: number, step: number, random: () => number): Tone[] {
  const notes: Tone[] = [];
  const add = (frequency: number, type: OscillatorType, duration: number, volume: number, sweep?: Tone['sweep']) => {
    if (frequency > 0) notes.push({ frequency, type, duration, volume, endVolume: .001, ...(sweep ? { sweep } : {}) });
  };
  switch (biome) {
    case 0:
      add(VOID[step % 12], 'sine', .9, .018);
      if (step % 4 === 0) add(55 + (step % 8) * 5, 'sine', 1.8, .025);
      break;
    case 1: {
      const f = NEBULA[step % 8];
      add(f, 'sine', .5, .022);
      if (step % 4 === 0) add(f * .5, 'triangle', 1.2, .014);
      break;
    }
    case 2:
      add(ION_BASS[step % 8], 'sawtooth', .18, .028);
      if (step % 2 === 0) add(ION_MELODY[step % 8], 'square', .12, .012);
      break;
    case 3: {
      const f = CRYSTAL[step % 12];
      add(f, 'triangle', .6, .018);
      if (step % 3 === 0) add(f * 1.5, 'sine', .4, .008);
      break;
    }
    case 4:
      add(SINGULARITY[step % 8], 'sawtooth', .7, .035);
      add(STABS[step % 8], 'square', .25, .015);
      break;
    case 5:
      add(GRAVITY[step % 8], 'sine', .55, .04);
      if (step % 3 === 0) add(110 + (step % 4) * 12, 'triangle', .8, .016, { frequency: 95 + (step % 4) * 10, duration: .4 });
      break;
    case 6:
      if (RHYTHM[step % 8]) add(82, 'square', .08, .022);
      add(PLUCKS[step % 8], 'triangle', .18, .014);
      break;
    case 7:
      add(PLASMA[step % 12], 'sawtooth', .12, .012);
      if (random() > .7) add(2200 + random() * 800, 'square', .04, .006);
      break;
    case 8: {
      const f = FRACTURE[step % 8];
      add(f, 'sine', .8, .018);
      add(f * 1.006, 'sine', .8, .016);
      if (step % 8 === 0) add(55, 'sawtooth', 2, .025);
      break;
    }
    case 9:
      add(METEOR[step % 8], 'sawtooth', .14, .032);
      add(ACCENTS[step % 8], 'square', .08, .01);
      break;
    case 10:
      if (step % 2 === 0) add(28 + (step % 6) * 2, 'sine', 1.4, .045);
      if (step % 9 === 0) add(180 + random() * 120, 'square', .3, .02);
      break;
    case 11: {
      const [f, type] = COSMIC[step % 6];
      add(f, type, .2, .018);
      break;
    }
    case 12:
      add(ASCENSION[step % 8], 'sine', .3, .02);
      break;
  }
  return notes;
}
