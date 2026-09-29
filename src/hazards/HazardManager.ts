import { pointToSegmentDistanceSquared } from '../core/math';
import type { Asteroid } from '../entities/Asteroid';
import { Rng } from '../core/rng';

export type IonEffect='invert'|'reducedThrust';
export type IonZone={x:number;y:number;width:number;height:number;effectType:IonEffect;phase:number};
export type Laser={a:Asteroid;b:Asteroid;phase:number};

export class HazardManager {
  readonly lasers:Laser[]=[]; readonly ions:IonZone[]=[]; private rng=new Rng(0x8792);
  spawnLaser(a:Asteroid,b:Asteroid):void{this.lasers.push({a,b,phase:this.rng.range(0,Math.PI*2)});}
  spawnArm(rock:Asteroid):void{rock.arm={length:rock.radius*1.8+20,angle:this.rng.range(0,Math.PI*2),speed:(this.rng.next()>.5?1:-1)*this.rng.range(.015,.03)};}
  spawnIon(x:number,y:number):void{this.ions.push({x,y,width:this.rng.range(200,350),height:this.rng.range(180,300),effectType:this.rng.next()>.5?'invert':'reducedThrust',phase:this.rng.range(0,Math.PI*2)});}
  update(speed:number, ship:{x:number;y:number}, asteroids:Asteroid[], shield:boolean, onShield:(x:number,y:number)=>void, onDeath:()=>void):IonEffect|null {
    for(let i=this.lasers.length-1;i>=0;i--){const l=this.lasers[i]!;l.phase+=.08;if(!asteroids.includes(l.a)||!asteroids.includes(l.b)||(l.a.x<-150&&l.b.x<-150)){this.lasers.splice(i,1);continue;}if(pointToSegmentDistanceSquared(ship.x,ship.y,l.a.x,l.a.y,l.b.x,l.b.y)<144){if(shield){onShield((l.a.x+l.b.x)/2,(l.a.y+l.b.y)/2);this.lasers.splice(i,1);}else onDeath();}}
    for(const a of asteroids){if(!a.arm)continue;a.arm.angle+=a.arm.speed;const ex=a.x+Math.cos(a.arm.angle)*a.arm.length,ey=a.y+Math.sin(a.arm.angle)*a.arm.length;if(pointToSegmentDistanceSquared(ship.x,ship.y,a.x,a.y,ex,ey)<100){if(shield){onShield(ex,ey);a.arm=undefined;}else onDeath();}}
    let active:IonEffect|null=null;
    for(let i=this.ions.length-1;i>=0;i--){const z=this.ions[i]!;z.x-=speed;z.phase+=.03;if(z.x+z.width<-50){this.ions.splice(i,1);continue;}if(ship.x>z.x&&ship.x<z.x+z.width&&ship.y>z.y&&ship.y<z.y+z.height)active=z.effectType;}
    return active;
  }
  clear():void{this.lasers.length=0;this.ions.length=0;}
}
