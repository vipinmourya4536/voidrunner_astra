import type { Asteroid } from '../entities/Asteroid';
import { BIOMES, type Biome } from '../data/biomes';
import { SHIPS, parseShipArt, shipArt, type ShipPixel } from '../data/ships';
import { Rng } from '../core/rng';

export type TextureRegion = { u0:number; v0:number; u1:number; v1:number; width:number; height:number; radius?:number };
export const ROCK_RADII = [16, 28, 40, 56, 80] as const;
export const ROCK_VARIANTS = 3;
const ATLAS_SIZE = 2048;

/** One bounded, eagerly built 16 MiB RGBA atlas. No texture uploads during gameplay. */
export class TextureCache {
  readonly texture: WebGLTexture;
  readonly regions = new Map<string, TextureRegion>();
  readonly byteSize = ATLAS_SIZE * ATLAS_SIZE * 4;
  private readonly rocks: TextureRegion[][][][] = [];
  private readonly ships: TextureRegion[] = [];
  private cursorX = 1; private cursorY = 1; private rowHeight = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < ATLAS_SIZE) throw new Error('VoidRunner requires a 2048px texture atlas');
    const atlas = document.createElement('canvas'); atlas.width = atlas.height = ATLAS_SIZE;
    const ctx = atlas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    // Descending sizes make shelf packing predictable. Background stone has no biome minerals in the source.
    for (let b = 0; b < BIOMES.length; b++) this.rocks[b] = [[], []];
    for (let bucket = ROCK_RADII.length - 1; bucket >= 0; bucket--) {
      for (let b = 0; b < BIOMES.length; b++) {
        this.rocks[b][1][bucket] = [];
        for (let v = 0; v < ROCK_VARIANTS; v++) {
          const c = createRockArt(ROCK_RADII[bucket], true, BIOMES[b], new Rng(0x7129 + bucket * 97 + v * 7919));
          const region = this.pack(ctx, `rock:${b}:${bucket}:${v}`, c); region.radius = ROCK_RADII[bucket];
          this.rocks[b][1][bucket][v] = region;
        }
      }
      const backgrounds: TextureRegion[] = [];
      for (let v = 0; v < ROCK_VARIANTS; v++) {
        const region = this.pack(ctx, `background:${bucket}:${v}`, createRockArt(ROCK_RADII[bucket], false, BIOMES[0], new Rng(0x921 + bucket * 97 + v * 7919)));
        region.radius = ROCK_RADII[bucket]; backgrounds.push(region);
      }
      for (let b = 0; b < BIOMES.length; b++) this.rocks[b][0][bucket] = backgrounds;
    }
    SHIPS.forEach((ship, index) => {
      const art = parseShipArt(shipArt(ship), ship.pixelSize);
      const c = document.createElement('canvas');
      // Exactly one texel per source design pixel, never rounded logical pixel positions.
      c.width = Math.round(art.width / art.pixelSize); c.height = Math.round(art.height / art.pixelSize);
      const s = c.getContext('2d')!;
      for (const p of art.pixels) { s.fillStyle = p.color; s.fillRect(Math.round((p.x + art.width / 2) / art.pixelSize), Math.round((p.y + art.height / 2) / art.pixelSize), 1, 1); }
      this.ships[index] = this.pack(ctx, `ship:ship-${index}`, c);
    });
    for (const label of ['invert', 'reducedThrust']) {
      const c = document.createElement('canvas'); c.width = 90; c.height = 16;
      const s = c.getContext('2d')!; s.fillStyle = '#c4b5fd'; s.font = '10px Courier New'; s.textAlign = 'center';
      s.fillText(label === 'invert' ? '⚡ INVERT' : '⚡ ION DRAG', 45, 12);
      this.pack(ctx, `label:${label}`, c);
    }
    this.texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    atlas.width = atlas.height = 1;
  }

  rockRegion(rock: Asteroid, biome: Biome): TextureRegion {
    let bucket = 0;
    for (let i = 1; i < ROCK_RADII.length; i++) if (Math.abs(ROCK_RADII[i] - rock.radius) < Math.abs(ROCK_RADII[bucket] - rock.radius)) bucket = i;
    const biomeIndex = Math.max(0, BIOMES.indexOf(biome));
    let hash = rock.seed | 0; hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b); hash ^= hash >>> 16;
    return this.rocks[biomeIndex][rock.foreground ? 1 : 0][bucket][(hash >>> 0) % ROCK_VARIANTS];
  }
  shipRegion(index:number):TextureRegion { return this.ships[index] ?? this.ships[0]; }
  // Compatibility entry points. Every region shares the same atlas texture.
  rockTexture(_rock:Asteroid, _biome:Biome):WebGLTexture { return this.texture; }
  shipTexture(_id:string, _width:number, _height:number, _pixels:ShipPixel[]):WebGLTexture { return this.texture; }
  dispose():void { this.gl.deleteTexture(this.texture); }

  private pack(ctx:CanvasRenderingContext2D, key:string, source:HTMLCanvasElement):TextureRegion {
    const w = source.width, h = source.height;
    if (this.cursorX + w + 1 > ATLAS_SIZE) { this.cursorX = 1; this.cursorY += this.rowHeight + 2; this.rowHeight = 0; }
    if (this.cursorY + h + 1 > ATLAS_SIZE) throw new Error('Prewarmed atlas capacity exceeded');
    ctx.drawImage(source, this.cursorX, this.cursorY);
    const r = { u0:this.cursorX / ATLAS_SIZE, v0:this.cursorY / ATLAS_SIZE, u1:(this.cursorX + w) / ATLAS_SIZE, v1:(this.cursorY + h) / ATLAS_SIZE, width:w, height:h };
    this.regions.set(key, r); this.cursorX += w + 2; this.rowHeight = Math.max(this.rowHeight, h);
    return r;
  }
}

/** Seeded transcription of reference/ship.html createRockModel/createRockTexture (2273–2429). */
function createRockArt(radius:number, foreground:boolean, biome:Biome, rng:Rng):HTMLCanvasElement {
  const vertices: {x:number;y:number}[] = [], craters: {x:number;y:number;r:number}[] = [], count = 8 + rng.int(0, 5);
  for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2, r = radius * (.68 + rng.next() * .32); vertices.push({ x:Math.cos(a) * r, y:Math.sin(a) * r }); }
  const craterCount = 2 + rng.int(0, 3);
  for (let i = 0; i < craterCount; i++) craters.push({ x:(rng.next() - .5) * radius * .9, y:(rng.next() - .5) * radius * .9, r:rng.next() * radius * .22 + 3 });
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(radius * 2 + 12);
  const ctx = c.getContext('2d')!, size = c.width, cx = size / 2, cy = size / 2;
  const outline = () => { ctx.beginPath(); vertices.forEach((v, i) => i ? ctx.lineTo(cx + v.x, cy + v.y) : ctx.moveTo(cx + v.x, cy + v.y)); ctx.closePath(); };
  ctx.save(); outline(); ctx.clip(); ctx.fillStyle = foreground ? '#222328' : '#0c0d10'; ctx.fillRect(0, 0, size, size);
  const px = foreground ? Math.max(3, Math.floor(radius / 12)) : 4;
  const base = foreground ? ['#2a2b30','#33343a','#1d1e22','#252629','#3a3b42','#1a1b1f','#2f3035','#222328','#28292e'] : ['#0c0d10','#111215','#0a0b0e','#131418','#0e0f13'];
  for (let y = 0; y < size; y += px) for (let x = 0; x < size; x += px) { ctx.fillStyle = rng.pick(base); ctx.fillRect(x, y, px, px); }
  if (foreground) {
    for (let y = 0; y < size * .5; y += px) for (let x = 0; x < size * .55; x += px) if (rng.next() > .65) { ctx.fillStyle = rng.next() > .5 ? '#3d3e45' : '#454650'; ctx.fillRect(x, y, px, px); }
    for (let y = size * .55; y < size; y += px) for (let x = size * .5; x < size; x += px) if (rng.next() > .6) { ctx.fillStyle = '#141518'; ctx.fillRect(x, y, px, px); }
    const minerals = ['#4a4d55', '#5a5d66', ...biome.minerals];
    for (let i = 0; i < Math.floor(radius / 8) + 2; i++) { const x = rng.next() * size, y = rng.next() * size; ctx.fillStyle = rng.pick(minerals); ctx.fillRect(x, y, px, px); if (rng.next() > .5) ctx.fillRect(x + px, y, px, px); }
  }
  for (const crater of craters) {
    ctx.fillStyle = foreground ? '#111215' : '#060709'; ctx.beginPath(); ctx.arc(cx + crater.x, cy + crater.y, crater.r, 0, Math.PI * 2); ctx.fill();
    const step = Math.max(2, px - 1), floor = foreground ? ['#0e1015','#161820','#0a0c10'] : ['#050608','#080a0e'];
    for (let y = -crater.r; y < crater.r; y += step) for (let x = -crater.r; x < crater.r; x += step) if (x * x + y * y < crater.r * crater.r * .85 && rng.next() > .4) { ctx.fillStyle = rng.pick(floor); ctx.fillRect(cx + crater.x + x, cy + crater.y + y, step, step); }
    if (foreground) { ctx.strokeStyle = '#4a4c55'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx + crater.x - 1, cy + crater.y - 1, crater.r + .5, -1.5, 1); ctx.stroke(); }
  }
  if (foreground && radius > 25) {
    const cracks = 1 + rng.int(0, 2); ctx.strokeStyle = '#16171c'; ctx.lineWidth = 1;
    for (let i = 0; i < cracks; i++) { let x = cx + (rng.next() - .5) * radius, y = cy + (rng.next() - .5) * radius; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (rng.next() - .5) * radius * .4; y += (rng.next() - .5) * radius * .4; ctx.lineTo(x, y); } ctx.stroke(); }
  }
  ctx.restore(); outline(); ctx.lineWidth = foreground ? 2 : 1.5; ctx.strokeStyle = foreground ? '#4b4d54' : '#1a1a20'; ctx.stroke();
  if (foreground) for (const v of vertices) if (v.y < -radius * .2 && rng.next() > .4) { ctx.fillStyle = '#555860'; ctx.fillRect(cx + v.x - 1, cy + v.y - 1, 2, 2); }
  return c;
}
