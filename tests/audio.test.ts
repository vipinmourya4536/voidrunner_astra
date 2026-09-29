import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { AudioManager } from '../src/audio/AudioManager';
import { audioRandom, firstNoteDelay, musicNotes, nextNoteDelay, type Tone } from '../src/audio/music';
import {
  CORRIDOR_ACTIVATE, CORRIDOR_EXPIRE, SHIELD_BREAK, SHIELD_EXPIRE, SHIP_SOUNDS,
  deathNotes, nitroNote, pickupNotes, sectorNotes, thrustNotes,
} from '../src/audio/effects';

// Capture AudioParam automation and node ownership without requiring an audio device.
class FakeParam {
  value = 0;
  events: { kind: string; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number): void { this.value = value; this.events.push({ kind: 'set', value, time }); }
  linearRampToValueAtTime(value: number, time: number): void { this.events.push({ kind: 'linear', value, time }); }
  exponentialRampToValueAtTime(value: number, time: number): void { this.events.push({ kind: 'exponential', value, time }); }
  cancelScheduledValues(time: number): void { this.events = this.events.filter(e => e.time < time); }
}
class FakeNode {
  connections: FakeNode[] = [];
  disconnected = false;
  connect(node: FakeNode): FakeNode { this.connections.push(node); return node; }
  disconnect(): void { this.disconnected = true; }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  frequency = new FakeParam();
  startTime = 0;
  endTime = Infinity;
  onended: (() => void) | null = null;
  constructor(private ctx: FakeContext) { super(); }
  start(time = 0): void { this.startTime = time; }
  stop(time = this.ctx.currentTime): void { this.endTime = time; }
}
class FakeContext {
  currentTime = 0;
  state: string = 'running';
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  onstatechange: (() => void) | null = null;
  createGain(): FakeGain { const g = new FakeGain(); this.gains.push(g); return g; }
  createOscillator(): FakeOscillator { const o = new FakeOscillator(this); this.oscillators.push(o); return o; }
  resume(): Promise<void> { this.changeState('running'); return Promise.resolve(); }
  close(): Promise<void> { this.changeState('closed'); return Promise.resolve(); }
  changeState(state: string): void { this.state = state; this.onstatechange?.(); }
  elapse(seconds: number): void {
    this.currentTime += seconds;
    for (const o of this.oscillators) if (o.endTime <= this.currentTime) o.onended?.();
  }
  live(): FakeOscillator[] { return this.oscillators.filter(o => !o.disconnected); }
}

function tones(oscillators: FakeOscillator[]): Tone[] {
  return oscillators.map(o => {
    const gain = (o.connections[0] as FakeGain).gain;
    const sweep = o.frequency.events.find(e => e.kind === 'linear');
    return {
      frequency: o.frequency.events.find(e => e.kind === 'set')?.value ?? o.frequency.value,
      type: o.type, duration: o.endTime - o.startTime,
      volume: gain.events.find(e => e.kind === 'set')!.value,
      endVolume: gain.events.find(e => e.kind === 'exponential')!.value,
      ...(sweep ? { sweep: { frequency: sweep.value, duration: sweep.time - o.startTime } } : {}),
    };
  });
}

const source = readFileSync(new URL('../reference/ship.html', import.meta.url), 'utf8');
const scoreSource = source.slice(source.indexOf('const BIOME_MUSIC ='), source.indexOf('function stopBiomeMusic'));

/** Execute the actual canonical music functions as the independent score oracle. */
function sourceScore(biome: number, seed: number) {
  const ctx = new FakeContext();
  let callback = () => {};
  let delay = 0;
  const schedule = (fn: () => void, ms: number) => { callback = fn; delay = ms / 1000; return 1; };
  const math = Object.create(Math) as Math;
  math.random = audioRandom(seed);
  const factories = runInNewContext(`(() => { ${scoreSource}; return BIOME_MUSIC; })()`, {
    Math: math, audioCtx: ctx, isMuted: false, bgMusicFadingOut: false, bgMusicGainNode: new FakeGain(),
    setInterval: schedule, setTimeout: schedule,
  }) as (() => void)[];
  factories[biome]();
  let count = 0;
  let offset = 0;
  return () => {
    if (biome !== 12 || count > 0) callback();
    count++;
    const result = { notes: tones(ctx.oscillators.slice(offset)), delay };
    offset = ctx.oscillators.length;
    return result;
  };
}

function setup(biome = 0) {
  vi.useFakeTimers();
  const ctx = new FakeContext();
  const audio = new AudioManager({ contextFactory: () => ctx as unknown as AudioContext, seed: 42 });
  audio.init();
  audio.setBiome(biome);
  const tick = (seconds: number) => {
    const steps = Math.ceil(seconds / .025);
    for (let i = 0; i < steps; i++) { ctx.elapse(seconds / steps); vi.advanceTimersByTime(seconds * 1000 / steps); }
  };
  return { ctx, audio, tick };
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('canonical procedural score parity', () => {
  it.each(Array.from({ length: 13 }, (_, biome) => [biome]))('matches every voice, envelope and interval in source biome %i', biome => {
    const oracle = sourceScore(biome, 83);
    const random = audioRandom(83);
    // 96 steps covers every secondary layer phase, including 9-step tension stabs.
    for (let step = 0; step < 96; step++) {
      const expected = oracle();
      expect(musicNotes(biome, step, random)).toEqual(expected.notes);
      expect(nextNoteDelay(biome, step)).toBeCloseTo(expected.delay, 11);
    }
    expect(firstNoteDelay(biome)).toBe(biome === 12 ? 0 : nextNoteDelay(biome, 0));
  });

  it('preserves immediate Ascension onset, post-note +.15 BPM and the 180 BPM cap', () => {
    const oracle = sourceScore(12, 1);
    let expectedTime = 0;
    let time = firstNoteDelay(12);
    expect(time).toBe(0);
    expect(nextNoteDelay(12, 0)).toBe(60 / 60.15);
    for (let step = 0; step < 1000; step++) {
      expectedTime += oracle().delay;
      time += nextNoteDelay(12, step);
      expect(time).toBeCloseTo(expectedTime, 8);
    }
    expect(nextNoteDelay(12, 799)).toBe(1 / 3);
    expect(nextNoteDelay(12, 5000)).toBe(1 / 3);
  });
});

describe('canonical ship and effect parity', () => {
  it.each([0, 1, 2, 3])('matches source thrust and nitro randomness, types and envelopes for ship %i', ship => {
    const ctx = new FakeContext();
    const math = Object.create(Math) as Math;
    math.random = audioRandom(92);
    const random = audioRandom(92);
    const effectsSource = source.slice(source.indexOf('const playSound ='), source.indexOf('// ---- PIXEL ART PALETTE'));
    const effects = runInNewContext(`(() => { ${effectsSource}; return { playShipThrust, playNitroSound, SHIP_SOUNDS }; })()`, {
      Math: math, audioCtx: ctx, isMuted: false, selectedShipType: ship,
    }) as { playShipThrust: () => void; playNitroSound: () => void; SHIP_SOUNDS: typeof SHIP_SOUNDS };
    expect(SHIP_SOUNDS[ship]).toEqual(effects.SHIP_SOUNDS[ship]);
    for (let i = 0; i < 32; i++) {
      let offset = ctx.oscillators.length;
      effects.playShipThrust();
      expect(thrustNotes(ship, random)).toEqual(tones(ctx.oscillators.slice(offset)));
      offset = ctx.oscillators.length;
      effects.playNitroSound();
      expect([nitroNote(ship, random)]).toEqual(tones(ctx.oscillators.slice(offset)));
    }
  });

  it('retains all source pickup, expiry, activation, impact and sector voices', () => {
    const tuples = (notes: readonly Tone[]) => notes.map(n => [n.frequency, n.type, n.duration, n.volume, n.endVolume]);
    expect(tuples(pickupNotes('shield'))).toEqual([[600, 'sine', .15, .08, .01], [900, 'sine', .12, .06, .01], [1200, 'triangle', .2, .04, .01]]);
    expect(tuples(pickupNotes('corridor'))).toEqual([[500, 'triangle', .15, .07, .01], [700, 'sine', .12, .05, .01], [1000, 'triangle', .18, .04, .01]]);
    expect(tuples(SHIELD_BREAK)).toEqual([[800, 'sine', .1, .12, .01], [400, 'triangle', .2, .08, .01], [200, 'sawtooth', .15, .06, .01]]);
    expect(tuples(SHIELD_EXPIRE)).toEqual([[400, 'sine', .2, .04, .01], [200, 'sine', .3, .03, .01]]);
    expect(tuples(CORRIDOR_ACTIVATE)).toEqual([[300, 'sine', .2, .08, .01], [500, 'triangle', .15, .06, .01]]);
    expect(tuples(CORRIDOR_EXPIRE)).toEqual([[200, 'sine', .2, .04, .01]]);
    expect(tuples(sectorNotes(5))).toEqual([[550, 'sine', .3, .06, .01], [600, 'triangle', .2, .04, .01]]);
    expect([0, 1, 2, 3].map(i => tuples(deathNotes(i)))).toEqual([
      [[150, 'sawtooth', .4, .2, .01], [80, 'sawtooth', .8, .2, .01]],
      [[200, 'sawtooth', .4, .2, .01], [120, 'sawtooth', .8, .2, .01]],
      [[100, 'sawtooth', .4, .2, .01], [60, 'sawtooth', .8, .2, .01]],
      [[70, 'sawtooth', .4, .2, .01], [40, 'sawtooth', .8, .2, .01]],
    ]);
  });
});

describe('audio lifecycle and bounded scheduling', () => {
  it('honors muted startup, starts the stored biome on unmute, and never multiplies timers', () => {
    vi.useFakeTimers();
    const ctx = new FakeContext();
    const audio = new AudioManager({ contextFactory: () => ctx as unknown as AudioContext });
    audio.muted = true;
    audio.setBiome(12);
    audio.init();
    expect(ctx.gains[0].gain.value).toBe(0);
    expect(ctx.oscillators).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    audio.setMuted(false);
    expect(tones(ctx.oscillators)[0].frequency).toBe(220);
    expect(vi.getTimerCount()).toBe(1);
    audio.setMuted(false);
    audio.setBiome(12);
    audio.advance();
    expect(ctx.oscillators).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    audio.setMuted(true);
    expect(ctx.live()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    audio.dispose();
  });

  it('schedules fixed motifs on the audio clock, starting after the first source interval', () => {
    const { audio, ctx, tick } = setup(0);
    expect(ctx.oscillators).toHaveLength(0);
    tick(.25);
    expect(ctx.oscillators.map(o => o.startTime)).toEqual([.3, .3]);
    tick(1.6);
    expect(ctx.oscillators.map(o => o.startTime)).toEqual([.3, .3, 1.2, 1.5, 1.8]);
    expect(ctx.oscillators[0].disconnected).toBe(true);
    expect(ctx.gains[0].gain.value).toBe(1);
    expect(ctx.gains[1].gain.value).toBe(.8);
    audio.dispose();
  });

  it('cannot let an old death fade stop a rapid restart of the same biome', () => {
    const { audio, ctx, tick } = setup(12);
    const oldBus = ctx.gains[1];
    audio.death(0);
    expect(vi.getTimerCount()).toBe(0);
    audio.reset(12);
    const restartBus = [...ctx.gains].reverse().find((g: FakeGain) => g.connections.includes(ctx.gains[0]))!;
    expect(oldBus.disconnected).toBe(true);
    expect(restartBus.disconnected).toBe(false);
    tick(2);
    expect(restartBus.disconnected).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    expect(ctx.live().length).toBeGreaterThan(0);
    audio.dispose();
    expect(ctx.live()).toHaveLength(0);
    expect(ctx.gains.every(g => g.disconnected)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resumes after pause and AudioContext interruption with no queued stale notes', () => {
    const { audio, ctx, tick } = setup(7);
    tick(.15);
    const previous = ctx.oscillators.length;
    audio.setPaused(true);
    expect(vi.getTimerCount()).toBe(0);
    tick(2);
    expect(ctx.oscillators).toHaveLength(previous);
    expect(ctx.live()).toHaveLength(0);
    audio.setMuted(true);
    audio.setMuted(false);
    expect(vi.getTimerCount()).toBe(0);
    audio.setPaused(false);
    expect(vi.getTimerCount()).toBe(1);
    ctx.changeState('interrupted');
    expect(vi.getTimerCount()).toBe(0);
    expect(ctx.live()).toHaveLength(0);
    ctx.changeState('running');
    expect(vi.getTimerCount()).toBe(1);
    tick(.2);
    expect(ctx.live().length).toBeGreaterThan(0);
    audio.dispose();
  });

  it('does not revive stopped music on unmute, resume or context state changes', () => {
    const { audio, ctx } = setup(12);
    audio.setMuted(true);
    audio.death(1);
    audio.setMuted(false);
    audio.setPaused(true);
    audio.setPaused(false);
    ctx.changeState('suspended');
    ctx.changeState('running');
    expect(ctx.live()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    audio.reset(12);
    expect(ctx.live()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    audio.dispose();
  });

  it('bounds nodes during effect spam and timers during rapid biome changes', () => {
    const { audio, ctx } = setup(12);
    for (let i = 0; i < 500; i++) audio.sound(440, 'sine', 1);
    expect(ctx.live()).toHaveLength(128);
    ctx.elapse(2);
    expect(ctx.live()).toHaveLength(0);
    for (let i = 0; i < 500; i++) {
      audio.setBiome(i % 13);
      audio.advance();
      expect(vi.getTimerCount()).toBe(1);
    }
    expect(ctx.live().length).toBeLessThan(5);
    audio.dispose();
    expect(ctx.gains.every(g => g.disconnected)).toBe(true);
  });

  it('rebases late callbacks rather than replaying an unbounded background backlog', () => {
    const { audio, ctx } = setup(7);
    const before = ctx.oscillators.length;
    ctx.elapse(3600);
    audio.advance();
    expect(ctx.oscillators.length - before).toBeLessThanOrEqual(4);
    expect(ctx.live().every(o => o.startTime >= 3600)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    audio.dispose();
  });

  it('keeps music randomness independent of effect call count and resets deterministically', () => {
    const { audio, ctx, tick } = setup(7);
    const run = (effects: boolean) => {
      audio.reset(7, 91);
      const offset = ctx.oscillators.length;
      for (let i = 0; i < 40; i++) {
        if (effects) audio.thrust(0);
        tick(.1);
      }
      return ctx.oscillators.slice(offset).filter(o => {
        const gain = o.connections[0] as FakeGain;
        return gain.connections[0] !== ctx.gains[0];
      }).map(o => o.frequency.value);
    };
    // The effect voices can alter fake-clock cleanup boundaries, but must not alter
    // the score's random stream or any already-scheduled score prefix.
    const withEffects = run(true);
    const withoutEffects = run(false);
    expect(withEffects.slice(0, 40)).toEqual(withoutEffects.slice(0, 40));
    audio.dispose();
  });

  it('supports source per-ship fixed-step thrust cadence and nitro cadence', () => {
    const { audio, ctx } = setup();
    audio.stop(0);
    for (let ship = 0; ship < 4; ship++) {
      const offset = ctx.oscillators.length;
      for (let frame = 1; frame <= 36; frame++) audio.thrust(ship, frame);
      const primary = tones(ctx.oscillators.slice(offset)).filter(n => n.volume === SHIP_SOUNDS[ship].vol);
      expect(primary).toHaveLength(36 / SHIP_SOUNDS[ship].rate);
    }
    const offset = ctx.oscillators.length;
    for (let frame = 1; frame <= 36; frame++) audio.nitro(0, frame);
    expect(ctx.oscillators.length - offset).toBe(3);
    audio.dispose();
  });
});
