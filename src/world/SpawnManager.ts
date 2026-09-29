import { Rng } from '../core/rng';
import type { Asteroid, PowerUp } from '../entities/Asteroid';
import type { HazardManager } from '../hazards/HazardManager';
import type { SectorManager } from './SectorManager';

export class SpawnManager {
  private rng=new Rng(0x20240929); private nextId=1;
  constructor(private readonly sector:SectorManager,private readonly hazards:HazardManager,private readonly foreground:Asteroid[],private readonly background:Asteroid[],private readonly powerUps:PowerUp[],private readonly width:number,private readonly height:number){}
  reset():void{this.nextId=1;}
  rock(x:number,y:number,radius:number,foreground=true):Asteroid{const a:Asteroid={id:this.nextId++,x,y,radius,rotation:this.rng.range(0,Math.PI*2),rotSpeed:this.rng.range(-.01,.01),foreground,parallax:this.rng.range(.3,.6),seed:this.rng.int(0,1_000_000)};(foreground?this.foreground:this.background).push(a);return a;}
  wave(distance:number, safeY:number):number {const startX=this.width+120;const reduction=this.sector.spawnReduction();const gapHalf=Math.max(120,Math.max(130,200-distance/40)*reduction);const center=Math.max(220,Math.min(this.height-220,safeY+this.rng.range(-40,40)));const countPatterns=5+Math.min(3,Math.floor((this.sector.current-1)/2));const pattern=this.sector.current%countPatterns;const recent:Asteroid[]=[];const safe=(y:number,g=gapHalf)=>Math.abs(y-center)<g;const add=(x:number,y:number,r:number)=>{if(!safe(y))recent.push(this.rock(x,y,r));};
    const density=this.sector.density();
    if(pattern===0){const n=Math.floor((4+this.rng.int(0,3))*density);for(let i=0;i<n;i++)add(startX+this.rng.range(-90,90),this.rng.range(0,this.height),this.rng.range(25,60));}
    else if(pattern===1){const size=this.rng.range(35,50);for(let y=size;y<this.height;y+=size*1.6+this.rng.range(0,20))add(startX+this.rng.range(-20,20),y,size+this.rng.range(-15,15));}
    else if(pattern===2){const n=Math.floor((5+this.rng.int(0,3))*density),up=this.rng.next()>.5;for(let i=0;i<n;i++){const t=i/n;add(startX+i*70,up?this.height*.85-t*this.height*.7:this.height*.15+t*this.height*.7,this.rng.range(28,53));}}
    else if(pattern===3){const clusters=Math.floor((2+this.rng.int(0,2))*density);for(let c=0;c<clusters;c++){const cy=this.rng.range(100,this.height-100);if(safe(cy,gapHalf+30))continue;const cx=startX+this.rng.range(-50,50);for(let j=0;j<2+this.rng.int(0,3);j++){const a=this.rng.range(0,Math.PI*2),d=this.rng.range(0,50);recent.push(this.rock(cx+Math.cos(a)*d,cy+Math.sin(a)*d,this.rng.range(20,50)));}}}
    else if(pattern===4){for(let i=0;i<2;i++)add(startX+this.rng.range(0,80),this.rng.range(100,this.height-100),this.rng.range(45,80));for(let i=0;i<4;i++)add(startX+this.rng.range(0,200),this.rng.range(0,this.height),this.rng.range(15,35));}
    else if(pattern===5){for(let i=0;i<Math.floor(6*density);i++)add(startX+i*50+this.rng.range(-20,20),this.rng.range(0,this.height),this.rng.range(20,50));}
    else {for(let i=0;i<Math.floor(5*density);i++)recent.push(this.rock(startX+i*60,center+(i%2?-1:1)*(gapHalf+20+this.rng.range(0,60)),this.rng.range(30,55)));}
    const roll=this.rng.next();if(roll<.18)this.powerUps.push({type:'shield',x:startX+50,y:center,radius:16,phase:0});else if(roll<.26)this.powerUps.push({type:'corridor',x:startX+50,y:center,radius:16,phase:0});
    if(this.sector.current>=2&&recent.length>=2&&this.rng.next()<Math.min(.5,.15+(this.sector.current-2)*.08)){let best:[Asteroid,Asteroid]|undefined,bestD=Infinity;for(let i=0;i<Math.min(8,recent.length);i++)for(let j=i+1;j<Math.min(8,recent.length);j++){const a=recent[i]!,b=recent[j]!,d=Math.hypot(a.x-b.x,a.y-b.y);if(d>60&&d<300&&d<bestD){bestD=d;best=[a,b];}}if(best)this.hazards.spawnLaser(best[0],best[1]);}
    if(this.sector.current>=3&&this.rng.next()<Math.min(.4,.1+(this.sector.current-3)*.07)){const large=recent.filter(a=>a.radius>=35);if(large.length)this.hazards.spawnArm(this.rng.pick(large));}
    if(this.sector.current>=4&&this.rng.next()<Math.min(.3,.08+(this.sector.current-4)*.05)){const y=this.rng.range(80,this.height-180);if(!safe(y+90,gapHalf*.5))this.hazards.spawnIon(startX+80,y);}
    if(this.rng.next()>.35)this.rock(startX+this.rng.range(0,300),this.rng.range(0,this.height),this.rng.range(20,70),false);
    return center;
  }
}
