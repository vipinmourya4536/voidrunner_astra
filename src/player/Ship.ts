import { clamp } from '../core/math';
import { SHIPS, parseShipArt, shipArt, type ShipTexture } from '../data/ships';

export class Ship {
  x = 160; y = 360; vy = 0; rotation = 0; bobPhase = 0; trailTimer = 0;
  width = 40; height = 40; nitro = 100; nitroActive = false; thrusting = false;
  texture: ShipTexture = parseShipArt(SHIPS[0]!.art, SHIPS[0]!.pixelSize);
  setType(index:number): void {
    const config = SHIPS[index]!; this.texture = parseShipArt(shipArt(config), config.pixelSize);
    this.width = this.texture.width * .75; this.height = this.texture.height * .75;
  }
  reset(index:number, x:number, y:number): void { this.x=x; this.y=y; this.vy=0; this.rotation=0; this.bobPhase=0; this.trailTimer=0; this.nitro=100; this.nitroActive=false; this.thrusting=false; this.setType(index); }
  update(index:number, thrust:boolean, nitro:boolean, ion:'invert'|'reducedThrust'|null, onExhaust:(x:number,y:number,color:string,count:number)=>void): void {
    const config = SHIPS[index]!; const input = thrust; this.thrusting = input;
    const thrustMod = ion === 'reducedThrust' ? .7 : 1;
    const effectiveThrust = ion === 'invert' ? -config.thrust : config.thrust;
    this.nitroActive = nitro && this.nitro > 0;
    if (input) {
      this.vy += effectiveThrust * thrustMod;
      const color = this.nitroActive ? config.nitroColor : config.exhaustColor;
      config.exhaust.forEach(p => onExhaust(this.x + p.x*this.width, this.y + p.y*this.height, color, config.thrustParticles));
      this.trailTimer++;
    }
    if (this.nitroActive) { this.nitro = Math.max(0, this.nitro - .6); this.vy *= .85; }
    else this.nitro = Math.min(100, this.nitro + .15);
    this.vy = clamp((this.vy + config.gravity) * config.dampening, -config.maxSpeed, config.maxSpeed);
    this.y += this.vy;
    if (config.bounce || config.avatarStyle === 'purrjector' || config.avatarStyle === 'nimbus') { this.bobPhase += .04; if (!input && Math.abs(this.vy)<1.5) this.y += Math.sin(this.bobPhase) * (config.avatarStyle === 'nimbus' ? .45 : .3); }
    const target = clamp(this.vy * config.tiltSpeed, -config.tiltRange, config.tiltRange);
    this.rotation += (target - this.rotation) * .15;
    const top = this.height * .3;
    if (this.y < top) { this.y=top; this.vy = config.bounce ? Math.abs(this.vy)*.5 : 0; }
  }
}

export function shipRockCollision(ship:Ship, rock:{x:number;y:number;radius:number}):boolean {
  const rx=ship.x-ship.width/2+8, ry=ship.y-ship.height/2+8, rw=ship.width-16, rh=ship.height-16;
  const tx=rock.x<rx?rx:rock.x>rx+rw?rx+rw:rock.x;
  const ty=rock.y<ry?ry:rock.y>ry+rh?ry+rh:rock.y;
  const dx=rock.x-tx, dy=rock.y-ty;
  return dx*dx+dy*dy <= (rock.radius*.72)**2;
}
