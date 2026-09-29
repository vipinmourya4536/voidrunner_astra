import { MAX_PARTICLES } from '../core/constants';
import { Rng } from '../core/rng';
export type Particle = { x:number;y:number;vx:number;vy:number;size:number;life:number;color:string;priority:number };
export class ParticleSystem {
  readonly items:Particle[]=[]; private readonly rng=new Rng(0x4927);
  emit(x:number,y:number,color:string,count:number,priority=1):void {
    const room=Math.max(0, MAX_PARTICLES-this.items.length); const n=Math.min(count,room);
    for(let i=0;i<n;i++) this.items.push({x,y,vx:-this.rng.range(2,7),vy:this.rng.range(-1.25,1.25),size:this.rng.range(1.5,4.5),life:1,color,priority});
  }
  explosion(x:number,y:number,count=50):void { const colors=['#ef4444','#f97316','#eab308','#fef08a','#ffffff']; const room=Math.max(0,MAX_PARTICLES-this.items.length); for(let i=0;i<Math.min(count,room);i++){const a=this.rng.range(0,Math.PI*2),s=this.rng.range(2,9);this.items.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:this.rng.range(2,7),life:1,color:this.rng.pick(colors),priority:3});} }
  shieldBreak(x:number,y:number):void { const colors=['#22d3ee','#06b6d4','#67e8f9','#0891b2','#ffffff']; this.emitBurst(x,y,colors,25,3); this.emitBurst(x,y,['#4b5563','#6b7280','#9ca3af','#f97316','#eab308'],18,2); }
  private emitBurst(x:number,y:number,colors:string[],count:number,priority:number):void { const room=Math.max(0,MAX_PARTICLES-this.items.length); for(let i=0;i<Math.min(count,room);i++){const a=this.rng.range(0,Math.PI*2),s=this.rng.range(1,6);this.items.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:this.rng.range(1.5,5.5),life:1,color:this.rng.pick(colors),priority});} }
  update(speedMultiplier:number):void { for(let i=this.items.length-1;i>=0;i--){const p=this.items[i]!;p.x+=p.vx*speedMultiplier;p.y+=p.vy;p.life-=.04;p.size*=.98;if(p.life<=0)this.items.splice(i,1);} }
}
