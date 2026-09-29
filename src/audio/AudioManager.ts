import { audioRandom, firstNoteDelay, musicNotes, nextNoteDelay, normalizeBiome, type Tone } from './music';
import {
  CORRIDOR_ACTIVATE, CORRIDOR_EXPIRE, SHIELD_BREAK, SHIELD_EXPIRE, SHIP_SOUNDS,
  deathNotes, effectTone, nitroNote, pickupNotes, sectorNotes, thrustNotes,
} from './effects';

interface MusicLoop {
  gain: GainNode;
  voices: Set<Voice>;
  step: number;
  nextTime: number;
  fadeStart: number;
  fadeDuration: number;
  initialGain: number;
  retired: boolean;
}
interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
  start: number;
  end: number;
  loop?: MusicLoop;
}
export interface AudioOptions {
  seed?: number;
  /** Injectable for tests; the default AudioContext is created only by init(). */
  contextFactory?: () => AudioContext | null;
}

const LOOKAHEAD = .1;
const PUMP_MS = 25;
const MAX_STEPS_PER_PUMP = 4;
const MAX_VOICES = 128;

/** One audio-clock scheduler, with no per-note or delayed fade JavaScript timers. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private loop: MusicLoop | null = null;
  private voices = new Set<Voice>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private biome = -1;
  private _muted = false;
  private _paused = false;
  private hadMusic = false;
  private seed: number;
  private musicRandom: () => number;
  private effectsRandom: () => number;
  private contextFactory: () => AudioContext | null;

  constructor(options: AudioOptions = {}) {
    this.seed = options.seed ?? 0x766f6964;
    this.musicRandom = audioRandom(this.seed);
    this.effectsRandom = audioRandom(this.seed ^ 0x73686970);
    this.contextFactory = options.contextFactory ?? (() => {
      if (typeof window === 'undefined') return null;
      const C = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return C ? new C() : null;
    });
  }

  get muted(): boolean { return this._muted; }
  set muted(value: boolean) { this.setMuted(value); }
  get paused(): boolean { return this._paused; }
  set paused(value: boolean) { this.setPaused(value); }

  init(): void {
    if (!this.ctx) {
      this.ctx = this.contextFactory();
      if (!this.ctx) return;
      this.master = this.ctx.createGain();
      // Source effects go straight to the destination; only the music bus is at .8.
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.ctx.onstatechange = this.onStateChange;
    }
    this.resumeContext();
    this.startMusic();
  }

  setMuted(value: boolean): void {
    if (this._muted === value) return;
    this._muted = value;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(value ? 0 : 1, this.ctx.currentTime);
    }
    if (value) {
      this.endLoop(0);
      this.clearVoices();
    } else {
      this.resumeContext();
      this.startMusic(.5);
    }
  }

  setPaused(value: boolean): void {
    if (this._paused === value) return;
    this._paused = value;
    if (value) this.endLoop(.4);
    else {
      this.resumeContext();
      this.startMusic(.5);
    }
  }

  setBiome(index: number): void {
    const biome = normalizeBiome(index);
    if (this.biome === biome && this.loop) return;
    this.endLoop(0);
    this.biome = biome;
    this.startMusic();
  }

  /** Stop music intent, including while muted/paused. Unmuting cannot revive a dead run. */
  stop(fadeDuration = .8): void {
    this.biome = -1;
    this.endLoop(Math.max(0, fadeDuration));
  }

  /** New run: cancel old tails, clear pause, reset both audio-only PRNG streams. */
  reset(biome = 0, seed = this.seed): void {
    this.stop(0);
    this.clearVoices();
    this._paused = false;
    this.seed = seed;
    this.musicRandom = audioRandom(seed);
    this.effectsRandom = audioRandom(seed ^ 0x73686970);
    this.setBiome(biome);
  }

  /** May also be called from the render loop. The single fallback timer handles idle frames. */
  advance(): void {
    const ctx = this.ctx;
    const loop = this.loop;
    if (!ctx || !loop || !this.canPlayMusic()) return;
    const now = ctx.currentTime;
    // onended normally cleans these; this also bounds retention if event dispatch is delayed.
    for (const voice of this.voices) if (voice.end <= now) this.releaseVoice(voice);
    // After a throttled main thread, keep the motif rather than emitting a catch-up burst.
    if (loop.nextTime < now - .05) loop.nextTime = now;
    let count = 0;
    while (loop.nextTime <= now + LOOKAHEAD && count++ < MAX_STEPS_PER_PUMP) {
      for (const note of musicNotes(this.biome, loop.step, this.musicRandom)) this.playTone(note, loop.nextTime, loop);
      loop.nextTime += nextNoteDelay(this.biome, loop.step++);
    }
    if (this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.advance();
      }, PUMP_MS);
    }
  }

  sound(freq: number, type: OscillatorType, duration: number, volume = .1): void {
    this.effects([effectTone(freq, type, duration, volume)]);
  }

  /** Pass the ship's trailTimer every fixed step to get source per-ship cadence (6/4/9/3). */
  thrust(ship: number, trailTimer?: number): void {
    if (trailTimer !== undefined && trailTimer % (SHIP_SOUNDS[ship] ?? SHIP_SOUNDS[0]).rate !== 0) return;
    if (this.canPlayEffects()) this.effects(thrustNotes(ship, this.effectsRandom));
  }

  /** Nitro cadence is every 12 source fixed steps. Omit trailTimer to emit immediately. */
  nitro(ship: number, trailTimer?: number): void {
    if (trailTimer !== undefined && trailTimer % 12 !== 0) return;
    if (this.canPlayEffects()) this.effects([nitroNote(ship, this.effectsRandom)]);
  }

  pickup(kind: 'shield' | 'corridor'): void { this.effects(pickupNotes(kind)); }
  shieldBreak(): void { this.effects(SHIELD_BREAK); }
  shieldExpire(): void { this.effects(SHIELD_EXPIRE); }
  corridorActivate(): void { this.effects(CORRIDOR_ACTIVATE); }
  corridorExpire(): void { this.effects(CORRIDOR_EXPIRE); }
  sector(sector: number): void { this.effects(sectorNotes(sector)); }
  death(ship: number): void {
    this.stop(.6);
    this.effects(deathNotes(ship));
  }

  dispose(): void {
    this.stop(0);
    this.clearVoices();
    const ctx = this.ctx;
    if (ctx) {
      ctx.onstatechange = null;
      if (ctx.state !== 'closed') void ctx.close().catch(() => {});
    }
    this.master?.disconnect();
    this.master = null;
    this.ctx = null;
    this.hadMusic = false;
  }

  private canPlayEffects(): boolean {
    return !!this.ctx && !!this.master && this.ctx.state === 'running' && !this.muted;
  }

  private canPlayMusic(): boolean {
    return this.canPlayEffects() && !this.paused && this.biome >= 0;
  }

  private resumeContext(): void {
    const ctx = this.ctx;
    // Safari can report "interrupted", in addition to the standard suspended state.
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
      void ctx.resume().then(() => {
        if (this.ctx === ctx) this.startMusic();
      }).catch(() => { /* A later user gesture can retry init()/unmute/resume. */ });
    }
  }

  private onStateChange = (): void => {
    if (this.ctx?.state === 'running') this.startMusic(.5);
    else {
      this.endLoop(0);
      this.clearVoices();
    }
  };

  private startMusic(fadeDuration = this.hadMusic ? 1.2 : 0): void {
    if (this.loop || !this.canPlayMusic()) return;
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.connect(this.master!);
    gain.gain.setValueAtTime(fadeDuration ? 0 : .8, now);
    if (fadeDuration) gain.gain.linearRampToValueAtTime(.8, now + fadeDuration);
    this.loop = {
      gain, voices: new Set(), step: 0, nextTime: now + firstNoteDelay(this.biome),
      fadeStart: now, fadeDuration, initialGain: fadeDuration ? 0 : .8, retired: false,
    };
    this.hadMusic = true;
    this.advance();
  }

  private endLoop(fadeDuration: number): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    const loop = this.loop;
    this.loop = null;
    if (!loop || !this.ctx) return;
    loop.retired = true;
    const now = this.ctx.currentTime;
    const gain = loop.fadeDuration ? Math.min(.8, .8 * (now - loop.fadeStart) / loop.fadeDuration) : loop.initialGain;
    loop.gain.gain.cancelScheduledValues(now);
    loop.gain.gain.setValueAtTime(gain, now);
    if (fadeDuration) loop.gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    else loop.gain.gain.setValueAtTime(0, now);
    for (const voice of loop.voices) {
      // Cancel lookahead notes that have not sounded. Fade only already-playing tails.
      if (!fadeDuration || voice.start > now) this.releaseVoice(voice, true);
      else {
        voice.end = Math.min(voice.end, now + fadeDuration);
        voice.oscillator.stop(voice.end);
      }
    }
    if (!loop.voices.size) loop.gain.disconnect();
  }

  private effects(notes: readonly Tone[]): void {
    if (!this.canPlayEffects()) return;
    for (const note of notes) this.playTone(note, this.ctx!.currentTime);
  }

  private playTone(note: Tone, start: number, loop?: MusicLoop): void {
    const ctx = this.ctx!;
    if (!(note.frequency > 0 && note.duration > 0 && note.volume > 0)
      || !Number.isFinite(note.frequency + note.duration + note.volume)) return;
    // A hard ceiling includes fading old loops and effects during rapid restarts.
    while (this.voices.size >= MAX_VOICES) this.releaseVoice(this.voices.values().next().value!, true);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.sweep) oscillator.frequency.linearRampToValueAtTime(note.sweep.frequency, start + note.sweep.duration);
    gain.gain.setValueAtTime(note.volume, start);
    gain.gain.exponentialRampToValueAtTime(note.endVolume, start + note.duration);
    oscillator.connect(gain);
    gain.connect(loop?.gain ?? this.master!);
    const voice: Voice = { oscillator, gain, start, end: start + note.duration, loop };
    this.voices.add(voice);
    loop?.voices.add(voice);
    oscillator.onended = () => this.releaseVoice(voice);
    oscillator.start(start);
    oscillator.stop(voice.end);
  }

  private releaseVoice(voice: Voice, stop = false): void {
    if (!this.voices.delete(voice)) return;
    voice.oscillator.onended = null;
    if (stop) voice.oscillator.stop();
    voice.oscillator.disconnect();
    voice.gain.disconnect();
    const loop = voice.loop;
    if (loop) {
      loop.voices.delete(voice);
      if (loop.retired && !loop.voices.size) loop.gain.disconnect();
    }
  }

  private clearVoices(): void {
    for (const voice of this.voices) this.releaseVoice(voice, true);
  }
}
