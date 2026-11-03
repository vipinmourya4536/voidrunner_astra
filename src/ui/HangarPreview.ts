import { PIXEL_PALETTE, SHIPS, shipArt, type ShipConfig } from '../data/ships';

/**
 * A tiny, independent hangar-only painter. It reads the exact source matrix packed
 * into the WebGL atlas, so a hangar card never drifts away from the in-game avatar.
 */
export class HangarPreview {
  private readonly ctx: CanvasRenderingContext2D;
  private selected = 0;
  private frameId = 0;
  private visible = true;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = 192; canvas.height = 112;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);
  }

  select(index: number): void { this.selected = index; }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    if (visible) this.frameId = requestAnimationFrame(this.tick);
    else cancelAnimationFrame(this.frameId);
  }

  private tick(now: number): void {
    if (!this.visible) return;
    this.draw(now / 1000);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private draw(time: number): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#050713'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.stars(time);
    const config = SHIPS[this.selected]!;
    const art = shipArt(config);
    const cols = Math.max(...art.map(row => row.length));
    const cell = Math.max(2, Math.floor(Math.min(104 / cols, 76 / art.length)));
    const bob = config.bounce || config.kind === 'character' ? Math.round(Math.sin(time * 3.2) * 2) : 0;
    const cx = 101, cy = 57 + bob;
    const left = Math.round(cx - cols * cell / 2), top = Math.round(cy - art.length * cell / 2);

    this.engineOrPersonality(config, left, top, cols, art.length, cell, time);
    this.paintArt(art, left, top, cell);
    this.foregroundPersonality(config, cx, cy, cols, art.length, cell, time);
  }

  private stars(time: number): void {
    const { ctx } = this;
    for (let i = 0; i < 17; i++) {
      const x = (i * 37 + 11) % 188 + 2, y = (i * 19 + 7) % 96 + 7;
      const bright = Math.sin(time * 2 + i * 1.9) > .55;
      ctx.fillStyle = bright ? '#c4b5fd' : '#475569';
      ctx.fillRect(x, y, bright ? 2 : 1, bright ? 2 : 1);
    }
  }

  private engineOrPersonality(config: ShipConfig, left: number, top: number, cols: number, rows: number, cell: number, time: number): void {
    const { ctx } = this;
    const midY = top + rows * cell / 2;
    if (config.avatarStyle === 'purrjector') {
      const puff = (time % 3.6) / 3.6;
      if (puff < .34) {
        ctx.fillStyle = '#84cc16';
        for (let i = 0; i < 4; i++) ctx.fillRect(left - 5 - i * 5 - Math.floor(puff * 15), midY + (i % 2 ? 5 : -4), 4 + (i % 2) * 2, 4);
      }
      return;
    }
    if (config.avatarStyle === 'nimbus') {
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 4; i++) ctx.fillRect(left - 4 - i * 6, midY + (i % 2 ? 5 : -3), 5 + (i % 2) * 3, 3);
      return;
    }
    if (config.avatarStyle === 'webslinger') return;
    ctx.fillStyle = config.exhaustColor;
    const flicker = Math.sin(time * 12) > 0 ? 10 : 6;
    ctx.fillRect(left - flicker, midY - cell * .8, flicker, Math.max(3, cell));
    ctx.fillRect(left - flicker, midY + cell * .2, flicker, Math.max(3, cell));
  }

  private paintArt(art: string[], left: number, top: number, cell: number): void {
    const { ctx } = this;
    art.forEach((row, y) => [...row].forEach((key, x) => {
      const color = PIXEL_PALETTE[key];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(left + x * cell, top + y * cell, cell, cell);
    }));
  }

  private foregroundPersonality(config: ShipConfig, cx: number, cy: number, cols: number, rows: number, cell: number, time: number): void {
    const { ctx, canvas } = this;
    if (config.avatarStyle === 'purrjector') {
      ctx.fillStyle = '#a16207';
      const bend = Math.round(Math.sin(time * 4) * 7);
      this.pixelLine(cx + cols * cell * .36, cy + rows * cell * .12, cx + cols * cell * .58, cy + rows * cell * .12 + bend, 3);
    }
    if (config.avatarStyle === 'nimbus') {
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - cols * cell * .6 - i * 7, cy + rows * cell * .28 + (i % 2 ? 4 : -3), 3, 3);
    }
    if (config.avatarStyle === 'webslinger' && Math.sin(time * 2.3) > .25) {
      ctx.fillStyle = '#f8fafc';
      this.pixelLine(cx + cols * cell * .28, cy - rows * cell * .08, canvas.width - 12, 19 + Math.round(Math.sin(time * 2) * 8), 2);
    }
  }

  private pixelLine(ax: number, ay: number, bx: number, by: number, cell: number): void {
    const { ctx } = this;
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / cell));
    for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(ax + (bx - ax) * i / steps), Math.round(ay + (by - ay) * i / steps), cell, cell);
  }
}
