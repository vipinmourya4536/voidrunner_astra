import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/constants';
import type { Asteroid, PowerUp } from '../entities/Asteroid';
import type { Particle } from '../effects/ParticleSystem';
import type { Ship } from '../player/Ship';
import type { Biome } from '../data/biomes';
import { SHIPS } from '../data/ships';
import { TextureCache, type TextureRegion } from './TextureCache';

type Star={x:number;y:number;size:number;speed:number;twinkle:number;color:string};
type CVertex=[number,number,number,number,number,number];
const TAU=Math.PI*2;

/** WebGL2 renderer. Geometry is assembled in reusable arrays and submitted in batches per pass. */
export class WebGLRenderer {
  readonly canvas:HTMLCanvasElement; readonly gl:WebGL2RenderingContext; readonly textures:TextureCache; quality=1;
  private colorProgram:WebGLProgram; private texProgram:WebGLProgram; private colorBuffer:WebGLBuffer; private texBuffer:WebGLBuffer;
  private colorLoc:WebGLUniformLocation; private texLoc:WebGLUniformLocation; private texSampler:WebGLUniformLocation; private colorViewLoc:WebGLUniformLocation; private texViewLoc:WebGLUniformLocation;
  private readonly colors:number[]=[]; private readonly texels:number[]=[];
  private readonly colorPos:number; private readonly colorAttr:number; private readonly texPos:number; private readonly texUv:number; private readonly texAlpha:number;
  private phase=0; private viewX=0; private viewWidth=LOGICAL_WIDTH;
  constructor(canvas:HTMLCanvasElement){
    this.canvas=canvas; const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'}); if(!gl)throw new Error('WebGL2 is required for VoidRunner'); this.gl=gl;
    this.colorProgram=this.program(`#version 300 es\nin vec2 p;in vec4 c;uniform vec4 v;out vec4 oColor;void main(){vec2 q=vec2((p.x-v.x)/v.z*2.0-1.0,p.y/v.w*2.0-1.0);gl_Position=vec4(q.x,-q.y,0,1);oColor=c;}`,`#version 300 es\nprecision mediump float;in vec4 oColor;out vec4 o;void main(){o=oColor;}`);
    this.texProgram=this.program(`#version 300 es\nin vec2 p;in vec2 uv;in float a;uniform vec4 v;out vec2 vuv;out float va;void main(){vec2 q=vec2((p.x-v.x)/v.z*2.0-1.0,p.y/v.w*2.0-1.0);gl_Position=vec4(q.x,-q.y,0,1);vuv=uv;va=a;}`,`#version 300 es\nprecision mediump float;in vec2 vuv;in float va;uniform sampler2D s;out vec4 o;void main(){o=texture(s,vuv)*vec4(1,1,1,va);}`);
    this.colorBuffer=gl.createBuffer()!; this.texBuffer=gl.createBuffer()!; this.colorLoc=gl.getUniformLocation(this.colorProgram,'v')!; this.texLoc=gl.getUniformLocation(this.texProgram,'v')!; this.texSampler=gl.getUniformLocation(this.texProgram,'s')!; this.colorViewLoc=this.colorLoc; this.texViewLoc=this.texLoc;
    this.colorPos=gl.getAttribLocation(this.colorProgram,'p');this.colorAttr=gl.getAttribLocation(this.colorProgram,'c');this.texPos=gl.getAttribLocation(this.texProgram,'p');this.texUv=gl.getAttribLocation(this.texProgram,'uv');this.texAlpha=gl.getAttribLocation(this.texProgram,'a');
    this.textures=new TextureCache(gl); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  resize(quality=this.quality):void{this.flush();this.quality=quality;const dpr=Math.min(2,window.devicePixelRatio||1);const width=Math.max(1,Math.floor(window.innerWidth*dpr*quality));const height=Math.max(1,Math.floor(window.innerHeight*dpr*quality));this.canvas.width=width;this.canvas.height=height;this.canvas.style.width='100%';this.canvas.style.height='100%';this.viewWidth=Math.max(LOGICAL_WIDTH,LOGICAL_HEIGHT*(width/Math.max(1,height)));this.viewX=(LOGICAL_WIDTH-this.viewWidth)/2;this.gl.viewport(0,0,width,height);}
  begin(color:string):void{this.flush();const c=this.hex(color);this.gl.clearColor(c[0],c[1],c[2],1);this.gl.clear(this.gl.COLOR_BUFFER_BIT);this.phase+=1;}
  /** Explicit simulation-owned animation hook; call once per fixed update if desired. */
  update(dt=1):void{this.phase+=dt;}
  drawBackground(previous:Biome,biome:Biome,t:number,phase:number):void{
    this.phase=phase;const blend=Math.max(0,Math.min(1,t));const top=this.mix(this.hex(previous.skyTop),this.hex(biome.skyTop),blend),bot=this.mix(this.hex(previous.skyBottom),this.hex(biome.skyBottom),blend);this.gradient(top,bot);
    this.drawEnvironment(previous,phase,1-blend);this.drawEnvironment(biome,phase,blend);
  }
  /** Every scene is made of small batched pixel marks, so transitions fade composition—not tiles. */
  private drawEnvironment(biome:Biome,phase:number,alpha:number):void{
    if(alpha<=.001)return;for(const n of biome.nebula){const a=(.018+.012*Math.sin(phase*.7+n.x*8))*alpha;this.cloud(n.x*LOGICAL_WIDTH,n.y*LOGICAL_HEIGHT,n.rx*LOGICAL_WIDTH,n.ry*LOGICAL_HEIGHT,this.hex(n.color),a);}
    switch(biome.environment){
      case 'violet-starfield': this.violetStarfield(phase,alpha); break;
      case 'nebula-whale': this.nebulaWhale(phase,alpha); break;
      case 'celestial-ruins': this.celestialRuins(phase,alpha); break;
      case 'spiral-garden': this.spiralGarden(phase,alpha,false); break;
      case 'chromatic-nebula': this.spiralGarden(phase,alpha,true); break;
      case 'event-horizon': this.eventHorizon(phase,alpha); break;
      case 'pale-galaxy': this.paleGalaxy(phase,alpha); break;
      case 'crystal-field': this.crystalField(phase,alpha); break;
      case 'ion-storm': this.ionStorm(phase,alpha); break;
      case 'meteor-cascade': this.meteorCascade(phase,alpha); break;
      case 'fracture-realm': this.fractureRealm(phase,alpha); break;
      case 'void-ascension': this.voidAscension(phase,alpha); break;
    }
  }
  private violetStarfield(phase:number,a:number):void{for(let i=0;i<5;i++){const x=(i*271+90)%LOGICAL_WIDTH,y=110+(i*137)%520;this.cloud(x,y,140,55,this.hex(i%2?'#581c87':'#312e81'),.045*a);this.starCross(x+42,y-18,5+(i%2)*2,this.hex(i%2?'#fef08a':'#a5f3fc'),.7*a);}for(let i=0;i<18;i++){const x=(i*73+phase*.12) % LOGICAL_WIDTH,y=(i*149+37)%LOGICAL_HEIGHT;this.rect(x,y,3+(i%3),3+(i%3),this.hex(i%4?'#a78bfa':'#67e8f9'),.28*a);}}
  private celestialRuins(phase:number,a:number):void{const drift=phase*.22;this.crescent(1035,138,34,a);for(let i=0;i<3;i++){const x=((i*425-drift)%(LOGICAL_WIDTH+250))-110,y=[118,505,300][i]!;this.temple(x,y,110+i*18,a);this.starCross(x+80,y-42,4,this.hex(i===1?'#f0abfc':'#bae6fd'),.55*a);}for(let i=0;i<9;i++){const x=(i*151+51)%LOGICAL_WIDTH,y=(i*79+113)%LOGICAL_HEIGHT;this.rect(x,y,4,4,this.hex(i%3?'#e879f9':'#f8fafc'),.55*a);}}
  private nebulaWhale(phase:number,a:number):void{this.cloud(920+Math.sin(phase*.012)*55,190,270,125,this.hex('#a78bfa'),.055*a);this.cloud(650,520,330,120,this.hex('#f472b6'),.04*a);this.stamp(WHALE_STAMP,790+Math.sin(phase*.009)*46,188,5,WHALE_PALETTE,a*.8);this.planet(192,165,31,'#7dd3fc','#0e7490',a*.72);this.planet(1084,545,24,'#f0abfc','#7c3aed',a*.6);for(let i=0;i<10;i++)this.starCross((i*131+85)%LOGICAL_WIDTH,(i*83+31)%LOGICAL_HEIGHT,3,this.hex(i%2?'#fef3c7':'#cffafe'),.32*a);}
  private spiralGarden(phase:number,a:number,chromatic:boolean):void{const cx=900,cy=365,base=chromatic?['#f472b6','#86efac','#7dd3fc','#fcd34d','#c4b5fd']:['#818cf8','#67e8f9','#c4b5fd'];for(let arm=0;arm<3;arm++)for(let i=0;i<62;i++){const angle=arm*TAU/3+i*.18+phase*.002,r=24+i*3.7;const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.54;this.rect(x,y,4+(i%3),4+(i%3),this.hex(base[(arm+i)%base.length]!),(.10+i/900)*a);}this.pixelDisc(cx,cy,18,this.hex('#f8fafc'),.75*a);this.planet(180,530,42,'#fb923c','#b45309',.65*a);this.planet(330,162,27,'#a5f3fc','#0e7490',.6*a);this.planet(1135,210,38,'#fde68a','#c2410c',.6*a);}
  private eventHorizon(phase:number,a:number):void{const cx=950,cy=320;for(let ring=0;ring<5;ring++){const rx=115+ring*27,ry=42+ring*13;this.pixelArc(cx,cy,rx,ry,phase*.014+ring*.68,TAU,this.hex(ring%2?'#ec4899':'#f97316'),(.15-ring*.018)*a,72);}this.pixelDisc(cx,cy,61,this.hex('#020205'),.98*a);this.pixelDisc(cx,cy,16,this.hex('#fdf4ff'),.36*a);for(let i=0;i<8;i++){const x=cx+Math.cos(i*.81+phase*.02)*(135+i*17),y=cy+Math.sin(i*.81+phase*.02)*(58+i*7);this.rect(x,y,4,4,this.hex('#c4b5fd'),.55*a);}}
  private paleGalaxy(phase:number,a:number):void{const cx=930,cy=260;for(let arm=0;arm<2;arm++)for(let i=0;i<55;i++){const angle=arm*Math.PI+i*.21-phase*.0015,r=14+i*4.5;this.rect(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r*.48,4,4,this.hex(i%3?'#bae6fd':'#c4b5fd'),(.10+i*.006)*a);}this.pixelDisc(cx,cy,22,this.hex('#f8fafc'),.7*a);this.planet(235,525,36,'#a5f3fc','#38bdf8',.52*a);}
  private fractureRealm(phase:number,a:number):void{for(let i=0;i<8;i++){const x=(i*177-phase*.35)%(LOGICAL_WIDTH+120)-60,y=70+(i*93)%580;this.pixelLine(x,y,x+68,y+(i%2?42:-42),this.hex(i%2?'#818cf8':'#4f46e5'),.32*a,4);this.pixelLine(x+68,y+(i%2?42:-42),x+104,y+(i%2?76:-76),this.hex('#c7d2fe'),.18*a,2);}for(let i=0;i<5;i++)this.starCross(190+i*224,120+(i*157)%420,4,this.hex('#a5b4fc'),.42*a);}
  private voidAscension(phase:number,a:number):void{this.paleGalaxy(phase,a*.75);for(let i=0;i<9;i++){const x=610+i*61,y=360+Math.sin(phase*.02+i)*140;this.rect(x,y,5,5,this.hex(i%2?'#f8fafc':'#94a3b8'),(.2+i*.015)*a);}}
  private crystalField(phase:number,a:number):void{for(let i=0;i<9;i++){const x=(i*151+phase*.42)%LOGICAL_WIDTH,y=80+(i*71)%560;this.pixelLine(x,y+42,x+16,y-30,this.hex('#67e8f9'),.45*a,4);this.pixelLine(x+16,y-30,x+31,y+46,this.hex('#22d3ee'),.35*a,4);this.pixelLine(x+31,y+46,x,y+42,this.hex('#0e7490'),.35*a,4);}}
  private ionStorm(phase:number,a:number):void{for(let i=0;i<7;i++){const x=(i*193-phase*1.3)%(LOGICAL_WIDTH+180)-90;this.pixelLine(x,0,x+115,LOGICAL_HEIGHT,this.hex(i%2?'#fb923c':'#f97316'),.12*a,4);}}
  private meteorCascade(phase:number,a:number):void{for(let i=0;i<12;i++){const x=(i*211-phase*1.5)%(LOGICAL_WIDTH+150),y=(i*97+phase*1.1)%LOGICAL_HEIGHT;this.pixelLine(x,y,x+45,y-65,this.hex('#fb923c'),.5*a,4);this.pixelLine(x+9,y-12,x+34,y-49,this.hex('#fef3c7'),.4*a,2);}}
  private temple(x:number,y:number,w:number,a:number):void{const pale=this.hex('#e0f2fe'),blue=this.hex('#1d4ed8');this.rect(x+w/2,y,w,8,pale,.75*a);this.rect(x+w/2,y+42,w+24,8,blue,.36*a);for(const offset of [18,w/2,w-18]){this.rect(x+offset,y+24,7,36,pale,.72*a);this.rect(x+offset,y+43,12,6,blue,.48*a);}this.rect(x+w/2,y+62,w+35,8,blue,.45*a);}
  private crescent(x:number,y:number,r:number,a:number):void{this.pixelDisc(x,y,r,this.hex('#f8fafc'),.8*a);this.pixelDisc(x+12,y-8,r-6,this.hex('#080c18'),1);}
  private planet(x:number,y:number,r:number,light:string,dark:string,a:number):void{this.pixelDisc(x,y,r,this.hex(dark),a);this.pixelDisc(x-r*.16,y-r*.16,r*.7,this.hex(light),a*.9);for(let row=-1;row<=1;row++)this.rect(x,y+row*r*.3,r*1.28,3,this.hex(row===0?dark:light),.4*a);}
  private starCross(x:number,y:number,size:number,color:number[],a:number):void{this.rect(x,y,size*3,2,color,a);this.rect(x,y,2,size*3,color,a);this.rect(x,y,size,size,color,a);}
  private pixelDisc(cx:number,cy:number,r:number,color:number[],a:number):void{const step=5;for(let y=-r;y<=r;y+=step){const half=Math.sqrt(Math.max(0,r*r-y*y));this.rect(cx,cy+y,Math.max(step,Math.floor(half*2/step)*step),step,color,a);}}
  private pixelArc(cx:number,cy:number,rx:number,ry:number,start:number,sweep:number,color:number[],a:number,segments:number):void{for(let i=0;i<segments;i++){const angle=start+sweep*i/segments;this.rect(cx+Math.cos(angle)*rx,cy+Math.sin(angle)*ry,4,4,color,a);}}
  private pixelLine(ax:number,ay:number,bx:number,by:number,color:number[],a:number,size=2):void{const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/size));for(let i=0;i<=steps;i++){const t=i/steps;this.rect(ax+(bx-ax)*t,ay+(by-ay)*t,size,size,color,a);}}
  private stamp(rows:readonly string[],cx:number,cy:number,pixel:number,palette:Readonly<Record<string,string>>,a:number):void{const h=rows.length,w=Math.max(...rows.map(row=>row.length));rows.forEach((row,y)=>[...row].forEach((ch,x)=>{const color=palette[ch];if(color)this.rect(cx+(x-w/2)*pixel,cy+(y-h/2)*pixel,pixel,pixel,this.hex(color),a);}));}
  stars(stars:Star[],speed:number,moving:boolean):void{for(const s of stars){if(moving){s.x-=s.speed*speed;if(s.x<0){s.x=LOGICAL_WIDTH;s.y=(s.y*37+17)%LOGICAL_HEIGHT;s.twinkle+=.7;}}this.rect(s.x+s.size/2,s.y+s.size/2,s.size,s.size,this.hex(s.color),(.4+.35*Math.sin(s.twinkle)));}}
  rock(a:Asteroid,biome:Biome):void{const r=this.textures.rockRegion(a,biome);this.sprite(r,a.x,a.y,r.width,r.height,a.rotation,1);}
  powerUp(p:PowerUp):void{const color=p.type==='shield'?'#22d3ee':'#34d399',pulse=.85+.15*Math.sin(p.phase*1.5);this.ring(p.x,p.y,20*pulse,this.hex(color),.5);const icon=p.type==='shield'?SHIELD_ICON:CORRIDOR_ICON;for(const q of icon)this.rect(p.x+q[0]*3,p.y+q[1]*3,3,3,this.hex(q[2]),.95);}
  particle(p:Particle):void{this.rect(p.x+p.size/2,p.y+p.size/2,p.size,p.size,this.hex(p.color),p.life);}
  ship(ship:Ship,index:number,webAnchor?:Asteroid):void{const config=SHIPS[index]!,r=this.textures.shipRegion(index),visualScale=config.avatarStyle?1.38:1.55,style=config.avatarStyle;
    if(style==='purrjector')this.purrjectorTrail(ship);
    if(style==='nimbus')this.nimbusTrail(ship);
    if(style==='webslinger'&&webAnchor)this.pixelLine(ship.x-ship.width*.18,ship.y-ship.height*.12,webAnchor.x,webAnchor.y,this.hex('#f8fafc'),.72,2);
    this.sprite(r,ship.x,ship.y,ship.width*visualScale,ship.height*visualScale,ship.rotation,1);
    if(style==='purrjector')this.catTail(ship);
    if(style==='webslinger'&&ship.thrusting)this.webslingerPose(ship);
    if(style==='webslinger'&&ship.nitroActive){this.pixelLine(ship.x-ship.width*.55,ship.y+ship.height*.15,ship.x-ship.width*1.4,ship.y+ship.height*.32,this.hex('#93c5fd'),.52,3);}
  }
  private purrjectorTrail(ship:Ship):void{if(!ship.thrusting&&!ship.nitroActive)return;const boost=ship.nitroActive,pulse=.45+.2*Math.sin(ship.trailTimer*.4),count=boost?7:3;for(let i=0;i<count;i++){const x=ship.x-ship.width*.65-i*(boost?8:6),y=ship.y+(i%2?8:-7)+Math.sin(ship.trailTimer*.3+i)*3;this.rect(x,y,7+i%3*3,6,this.hex(i%2?'#bef264':'#84cc16'),pulse-i*.045);}}
  private catTail(ship:Ship):void{const bend=Math.sin(ship.bobPhase)*8;this.pixelLine(ship.x+ship.width*.38,ship.y+ship.height*.18,ship.x+ship.width*.7,ship.y+ship.height*.12+bend,this.hex('#a16207'),.9,4);}
  private nimbusTrail(ship:Ship):void{const bob=Math.sin(ship.bobPhase)*4;for(let i=0;i<4;i++){const x=ship.x-ship.width*.66-i*9,y=ship.y+ship.height*.3+bob+(i%2?4:-3);this.rect(x,y,13+i*3,7,this.hex(ship.nitroActive?'#fef08a':'#facc15'),.45+i*.08);}if(ship.nitroActive)for(let i=0;i<7;i++)this.rect(ship.x-ship.width*.7-i*11,ship.y+(i%3-1)*7,4,4,this.hex('#fef08a'),.55);}
  private webslingerPose(ship:Ship):void{const reach=ship.nitroActive?ship.width*.68:ship.width*.5;this.pixelLine(ship.x+ship.width*.12,ship.y-ship.height*.05,ship.x+reach,ship.y-ship.height*.28,this.hex('#ef4444'),.85,3);this.rect(ship.x+reach,ship.y-ship.height*.28,4,4,this.hex('#f8fafc'),.9);}
  laser(a:Asteroid,b:Asteroid,phase:number):void{const alpha=.4+.3*Math.sin(phase);this.line(a.x,a.y,b.x,b.y,this.hex('#ef4444'),alpha*.3,7);this.line(a.x,a.y,b.x,b.y,this.hex('#f87171'),alpha*.6,3);this.line(a.x,a.y,b.x,b.y,this.hex('#fecaca'),alpha+.2,1);this.rect(a.x,a.y,6,6,this.hex('#ef4444'),.8);this.rect(b.x,b.y,6,6,this.hex('#ef4444'),.8);}
  arm(a:Asteroid,phase:number):void{if(!a.arm)return;const x=a.x+Math.cos(a.arm.angle)*a.arm.length,y=a.y+Math.sin(a.arm.angle)*a.arm.length,alpha=.5+.2*Math.sin(phase);this.line(a.x,a.y,x,y,this.hex('#f97316'),alpha*.3,8);this.line(a.x,a.y,x,y,this.hex('#fbbf24'),alpha+.3,3);this.line(a.x,a.y,x,y,this.hex('#fef3c7'),.9,1);this.rect(x,y,8,8,this.hex('#fbbf24'),1);this.rect(x,y,4,4,this.hex('#fef3c7'),1);}
  ion(x:number,y:number,w:number,h:number,label:string,phase:number):void{this.rect(x+w/2,y+h/2,w,h,this.hex('#7c3aed'),.07+.02*Math.sin(phase));this.line(x,y,x+w,y,this.hex('#a78bfa'),.35);this.line(x,y+h,x+w,y+h,this.hex('#a78bfa'),.35);this.sprite(this.textures.regions.get(`label:${label}`)!,x+w/2,y+h/2,90,16,0,.2);}
  corridor():void{const c=LOGICAL_HEIGHT/2,h=LOGICAL_HEIGHT*.18;this.rect(LOGICAL_WIDTH/2,(c-h)/2,LOGICAL_WIDTH,c-h,this.hex('#10b981'),.05);this.rect(LOGICAL_WIDTH/2,(c+h+LOGICAL_HEIGHT)/2,LOGICAL_WIDTH,LOGICAL_HEIGHT-c-h,this.hex('#10b981'),.05);this.line(0,c-h,LOGICAL_WIDTH,c-h,this.hex('#34d399'),.35);this.line(0,c+h,LOGICAL_WIDTH,c+h,this.hex('#34d399'),.35);}
  shield(ship:Ship,phase:number):void{this.ring(ship.x,ship.y,Math.max(ship.width,ship.height)*.55*(1+.08*Math.sin(phase)),this.hex('#22d3ee'),.38);for(let i=0;i<16;i++){const a=i/16*TAU+phase*.5;this.rect(ship.x+Math.cos(a)*ship.width*.3,ship.y+Math.sin(a)*ship.width*.3,3,3,this.hex(i%2?'#67e8f9':'#22d3ee'),.5);}}
  private gradient(top:number[],bottom:number[]):void{const left=this.viewX,center=this.viewX+this.viewWidth/2;const v:CVertex[]=[[left,0,...top,1],[left+this.viewWidth,0,...top,1],[left+this.viewWidth,LOGICAL_HEIGHT,...bottom,1],[left,0,...top,1],[left+this.viewWidth,LOGICAL_HEIGHT,...bottom,1],[left,LOGICAL_HEIGHT,...bottom,1]] as CVertex[];void center;this.submitColor(v);}
  private rect(x:number,y:number,w:number,h:number,color:number[],alpha:number):void{this.quad(x,y,w,h,0,alpha,color);}
  private line(ax:number,ay:number,bx:number,by:number,color:number[],alpha:number,width=1):void{const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;this.quad((ax+bx)/2,(ay+by)/2,len,width,Math.atan2(dy,dx),alpha,color);}
  private ring(cx:number,cy:number,r:number,color:number[],alpha:number):void{const n=24,v:number[]=[];for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;v.push(...this.vertex(cx+Math.cos(a)*r,cy+Math.sin(a)*r,color,alpha),...this.vertex(cx+Math.cos(b)*r,cy+Math.sin(b)*r,color,alpha));}this.submitColor(v);}
  private ellipse(cx:number,cy:number,rx:number,ry:number,color:number[],alpha:number):void{const n=32,v:number[]=[];for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;v.push(...this.vertex(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,color,alpha),...this.vertex(cx+Math.cos(b)*rx,cy+Math.sin(b)*ry,color,alpha));}this.submitColor(v);}
  /** Soft, overlapping ellipses avoid the hard tile edges caused by nebula rectangles. */
  private cloud(cx:number,cy:number,rx:number,ry:number,color:number[],alpha:number):void{for(let i=3;i>=1;i--)this.ellipse(cx,cy,rx*i/3,ry*i/3,color,alpha*(4-i)/3);}
  private wave(y:number,p:number,color:number[],alpha:number):void{for(let x=0;x<LOGICAL_WIDTH;x+=12)this.line(x,y+Math.sin(x*.012+p)*22,x+12,y+Math.sin((x+12)*.012+p)*22,color,alpha);}
  private poly(points:number[][],color:number[],alpha:number):void{for(let i=1;i<points.length-1;i++)this.submitColor([...this.vertex(points[0][0],points[0][1],color,alpha),...this.vertex(points[i][0],points[i][1],color,alpha),...this.vertex(points[i+1][0],points[i+1][1],color,alpha)]);}
  private quad(x:number,y:number,w:number,h:number,rot:number,alpha:number,color:number[]):void{const c=Math.cos(rot),s=Math.sin(rot),hw=w/2,hh=h/2,p=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(q=>[x+q[0]*c-q[1]*s,y+q[0]*s+q[1]*c]);for(const i of [0,1,2,0,2,3])this.colors.push(...this.vertex(p[i][0],p[i][1],color,alpha));}
  private vertex(x:number,y:number,color:number[],a:number):number[]{return [x,y,color[0],color[1],color[2],a];}
  private sprite(r:TextureRegion,x:number,y:number,w:number,h:number,rot:number,alpha:number):void{if(!r)return;const c=Math.cos(rot),s=Math.sin(rot),hw=w/2,hh=h/2,p=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(q=>[x+q[0]*c-q[1]*s,y+q[0]*s+q[1]*c]),uv=[[r.u0,r.v0],[r.u1,r.v0],[r.u1,r.v1],[r.u0,r.v1]];for(const i of [0,1,2,0,2,3])this.texels.push(p[i][0],p[i][1],uv[i][0],uv[i][1],alpha);this.flushColor();this.submitTexture();}
  private submitColor(v:number[]|CVertex[]):void{const flat=typeof v[0]==='number'?v as number[]:(v as CVertex[]).flatMap(x=>x);this.flushTextureOnly();this.colors.push(...flat);}
  private flushColor():void{if(!this.colors.length)return;const gl=this.gl;gl.useProgram(this.colorProgram);gl.uniform4f(this.colorViewLoc,this.viewX,0,this.viewWidth,LOGICAL_HEIGHT);gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.colors),gl.STREAM_DRAW);gl.enableVertexAttribArray(this.colorPos);gl.vertexAttribPointer(this.colorPos,2,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(this.colorAttr);gl.vertexAttribPointer(this.colorAttr,4,gl.FLOAT,false,24,8);gl.drawArrays(gl.TRIANGLES,0,this.colors.length/6);this.colors.length=0;}
  private submitTexture():void{this.flushColor();this.flushTextureOnly();}
  private flushTextureOnly():void{if(!this.texels.length)return;const gl=this.gl;gl.useProgram(this.texProgram);gl.uniform4f(this.texViewLoc,this.viewX,0,this.viewWidth,LOGICAL_HEIGHT);gl.uniform1i(this.texSampler,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures.texture);gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.texels),gl.STREAM_DRAW);gl.enableVertexAttribArray(this.texPos);gl.vertexAttribPointer(this.texPos,2,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(this.texAlpha);gl.vertexAttribPointer(this.texAlpha,1,gl.FLOAT,false,20,16);gl.enableVertexAttribArray(this.texUv);gl.vertexAttribPointer(this.texUv,2,gl.FLOAT,false,20,8);gl.drawArrays(gl.TRIANGLES,0,this.texels.length/5);this.texels.length=0;}
  private flush():void{this.flushColor();this.submitTexture();}
  private program(vs:string,fs:string):WebGLProgram{const gl=this.gl,compile=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'shader error');return s;};const p=gl.createProgram()!;gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'program error');return p;}
  private hex(hex:string):number[]{if(hex.startsWith('rgb')){const n=hex.match(/\d+/g)!.map(Number);return[n[0]/255,n[1]/255,n[2]/255];}const h=hex.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];}
  private mix(a:number[],b:number[],t:number):number[]{return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
}
const WHALE_STAMP=[
  '__________________ccccc__________','______________ccccCCCCCCccc______','___________cccCCCCCWWCCCCCCccc___','_________ccCCCWWWWWWWWWCCCCCccc__','_______ccCCCWWWWWWWWWWWWCCCCCCc__','_____ccCCCWWWWWWWWWWWWWWWCCCCCc__','___ccCCCWWWWWWWWWWWWWWWWWWWCCCCc_','__cCCCWWWWWWWWWWWWWWWWWWWWWWCCCc_','___ccCCCWWWWWWWWWWWWWWWWWWCCCCc__','_____ccCCCWWWWWWWWWWWWWWWCCCCCc__','_______ccCCCWWWWWWWWWWWWCCCCCCc__','_________ccCCCWWWWWWWWWCCCCCccc__','___________cccCCCCCCCCCCCCCccc___','______________ccccCCCCccccc______'
] as const;
const WHALE_PALETTE={W:'#c4b5fd',C:'#a78bfa',c:'#7c3aed'} as const;
const SHIELD_ICON:[number,number,string][]=[[-1,-3,'#22d3ee'],[0,-4,'#06b6d4'],[1,-3,'#22d3ee'],[-2,-2,'#06b6d4'],[0,-2,'#0e7490'],[2,-2,'#06b6d4'],[-3,-1,'#22d3ee'],[0,0,'#67e8f9'],[3,-1,'#22d3ee'],[-2,1,'#06b6d4'],[0,2,'#0e7490'],[2,1,'#06b6d4'],[0,4,'#06b6d4']];
const CORRIDOR_ICON:[number,number,string][]=[[-1,-3,'#10b981'],[0,-4,'#34d399'],[1,-3,'#10b981'],[-3,0,'#10b981'],[-1,0,'#6ee7b7'],[0,0,'#a7f3d0'],[1,0,'#6ee7b7'],[3,0,'#10b981'],[-1,3,'#10b981'],[0,4,'#34d399'],[1,3,'#10b981']];
