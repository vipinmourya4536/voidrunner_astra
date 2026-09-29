import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/constants';
import type { Asteroid, PowerUp } from '../entities/Asteroid';
import type { Particle } from '../effects/ParticleSystem';
import type { Ship } from '../player/Ship';
import type { Biome } from '../data/biomes';
import { TextureCache, type TextureRegion } from './TextureCache';

type Star={x:number;y:number;size:number;speed:number;twinkle:number;color:string};
type CVertex=[number,number,number,number,number,number];
const TAU=Math.PI*2;

/** WebGL2 renderer. Geometry is assembled in reusable arrays and submitted in batches per pass. */
export class WebGLRenderer {
  readonly canvas:HTMLCanvasElement; readonly gl:WebGL2RenderingContext; readonly textures:TextureCache; quality=1;
  private colorProgram:WebGLProgram; private texProgram:WebGLProgram; private colorBuffer:WebGLBuffer; private texBuffer:WebGLBuffer;
  private colorLoc:WebGLUniformLocation; private texLoc:WebGLUniformLocation; private texSampler:WebGLUniformLocation;
  private readonly colors:number[]=[]; private readonly texels:number[]=[];
  private readonly colorPos:number; private readonly colorAttr:number; private readonly texPos:number; private readonly texUv:number; private readonly texAlpha:number;
  private phase=0;
  constructor(canvas:HTMLCanvasElement){
    this.canvas=canvas; const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'}); if(!gl)throw new Error('WebGL2 is required for VoidRunner'); this.gl=gl;
    this.colorProgram=this.program(`#version 300 es\nin vec2 p;in vec4 c;uniform vec2 r;out vec4 v;void main(){vec2 q=p/r*2.0-1.0;gl_Position=vec4(q.x,-q.y,0,1);v=c;}`,`#version 300 es\nprecision mediump float;in vec4 v;out vec4 o;void main(){o=v;}`);
    this.texProgram=this.program(`#version 300 es\nin vec2 p;in vec2 uv;in float a;uniform vec2 r;out vec2 vuv;out float va;void main(){vec2 q=p/r*2.0-1.0;gl_Position=vec4(q.x,-q.y,0,1);vuv=uv;va=a;}`,`#version 300 es\nprecision mediump float;in vec2 vuv;in float va;uniform sampler2D s;out vec4 o;void main(){o=texture(s,vuv)*vec4(1,1,1,va);}`);
    this.colorBuffer=gl.createBuffer()!; this.texBuffer=gl.createBuffer()!; this.colorLoc=gl.getUniformLocation(this.colorProgram,'r')!; this.texLoc=gl.getUniformLocation(this.texProgram,'r')!; this.texSampler=gl.getUniformLocation(this.texProgram,'s')!;
    this.colorPos=gl.getAttribLocation(this.colorProgram,'p');this.colorAttr=gl.getAttribLocation(this.colorProgram,'c');this.texPos=gl.getAttribLocation(this.texProgram,'p');this.texUv=gl.getAttribLocation(this.texProgram,'uv');this.texAlpha=gl.getAttribLocation(this.texProgram,'a');
    this.textures=new TextureCache(gl); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  resize(quality=this.quality):void{this.flush();this.quality=quality;const dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.max(1,Math.floor(window.innerWidth*dpr*quality));this.canvas.height=Math.max(1,Math.floor(window.innerHeight*dpr*quality));this.canvas.style.width='100%';this.canvas.style.height='100%';this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  begin(color:string):void{this.flush();const c=this.hex(color);this.gl.clearColor(c[0],c[1],c[2],1);this.gl.clear(this.gl.COLOR_BUFFER_BIT);this.phase+=1;}
  /** Explicit simulation-owned animation hook; call once per fixed update if desired. */
  update(dt=1):void{this.phase+=dt;}
  drawBackground(biome:Biome,t:number,phase:number):void{
    this.phase=phase;const prev=biome; const top=this.hex(biome.skyTop),bot=this.hex(biome.skyBottom); this.gradient(top,bot);
    for(const n of biome.nebula){const a=.035+.01*Math.sin(phase*.7+n.x*8);this.rect(n.x*LOGICAL_WIDTH,n.y*LOGICAL_HEIGHT,n.rx*LOGICAL_WIDTH,n.ry*LOGICAL_HEIGHT,this.hex(biome.accent),a);}
    const p=biome.parallax;
    if(p==='storm')for(let i=0;i<7;i++)this.line(i*190-40,0,i*190+90,LOGICAL_HEIGHT,this.hex('#fb923c'),.035);
    else if(p==='crystal')for(let i=0;i<10;i++){const x=(i*173+phase*3)%LOGICAL_WIDTH;this.poly([[x,100+(i*41)%500],[x+10,70+(i*41)%500],[x+18,130+(i*41)%500],[x+3,155+(i*41)%500]],this.hex('#22d3ee'),.16);}
    else if(p==='singularity')for(let i=1;i<=5;i++)this.ellipse(LOGICAL_WIDTH/2,LOGICAL_HEIGHT/2,i*90+Math.sin(phase*.02+i)*15,i*55+Math.sin(phase*.02+i)*9,this.hex(i%2?'#a21caf':'#d946ef'),.05-i*.006);
    else if(p==='gravity')for(let row=1;row<=4;row++){const y=LOGICAL_HEIGHT*row/5;this.wave(y,phase*.02+row*1.4,this.hex('#38bdf8'),.045);}
    else if(p==='derelict')for(let i=0;i<3;i++){const x=(i*310-phase*.3)% (LOGICAL_WIDTH+220)-100,y=100+i*190;this.rect(x,y,150,40,this.hex('#334155'),.08);this.rect(x,y,190,7,this.hex('#334155'),.08);}
    else if(p==='plasma')for(let i=0;i<6;i++){let x=(i*251+Math.sin(phase*.01+i)*100)%LOGICAL_WIDTH,y=(i*113)%LOGICAL_HEIGHT;for(let j=0;j<6;j++){const nx=x+Math.sin(i+j*2.1+phase*.01)*130,ny=y+Math.cos(i+j*1.7+phase*.01)*100;this.line(x,y,nx,ny,this.hex('#06b6d4'),.07);x=nx;y=ny;}}
    else if(p==='fracture'){this.line(0,LOGICAL_HEIGHT/2,LOGICAL_WIDTH,LOGICAL_HEIGHT/2,this.hex('#818cf8'),.12);}
    else if(p==='meteor')for(let i=0;i<12;i++){const x=(i*211-phase*1.5)%(LOGICAL_WIDTH+150),y=(i*97+phase*1.1)%LOGICAL_HEIGHT;this.line(x,y,x+45,y-65,this.hex('#fb923c'),.22);}
    else if(p==='horizon')for(let i=1;i<=7;i++)this.ellipse(LOGICAL_WIDTH/2,LOGICAL_HEIGHT/2,i*110,i*75,this.hex(i%2?'#7c3aed':'#a855f7'),.045-i*.004);
    else if(p==='cosmic')for(let i=0;i<5;i++){let x=(i*251+Math.sin(phase*.01+i)*200)%LOGICAL_WIDTH,y=(i*149)%LOGICAL_HEIGHT;for(let j=0;j<7;j++){const nx=x+Math.sin(i+j*1.9+phase*.01)*95,ny=y+Math.cos(i+j*2.3+phase*.01)*70;this.line(x,y,nx,ny,this.hex(['#f472b6','#86efac','#7dd3fc','#fcd34d','#c4b5fd'][i]),.06);x=nx;y=ny;}}
    else if(p==='ascension'){const vx=LOGICAL_WIDTH/2,vy=LOGICAL_HEIGHT/2;for(let i=-10;i<=10;i++){const x=i*60;this.line(vx+x,vy,vx+x*3,LOGICAL_HEIGHT,this.hex('#f8fafc'),.06);this.line(vx+x,vy,vx+x*3,0,this.hex('#f8fafc'),.06);}for(let i=1;i<7;i++){const y=(i/6+phase*.0005%(.166))%1;this.line(vx-y*LOGICAL_WIDTH,vy-y*(vy+50),vx+y*LOGICAL_WIDTH,vy-y*(vy+50),this.hex('#f8fafc'),.06);this.line(vx-y*LOGICAL_WIDTH,vy+y*(vy+50),vx+y*LOGICAL_WIDTH,vy+y*(vy+50),this.hex('#f8fafc'),.06);}}
    void prev;
  }
  stars(stars:Star[],speed:number,moving:boolean):void{for(const s of stars){if(moving){s.x-=s.speed*speed;if(s.x<0){s.x=LOGICAL_WIDTH;s.y=(s.y*37+17)%LOGICAL_HEIGHT;s.twinkle+=.7;}}this.rect(s.x+s.size/2,s.y+s.size/2,s.size,s.size,this.hex(s.color),(.4+.35*Math.sin(s.twinkle)));}}
  rock(a:Asteroid,biome:Biome):void{const r=this.textures.rockRegion(a,biome);this.sprite(r,a.x,a.y,r.width,r.height,a.rotation,1);}
  powerUp(p:PowerUp):void{const color=p.type==='shield'?'#22d3ee':'#34d399',pulse=.85+.15*Math.sin(p.phase*1.5);this.ring(p.x,p.y,20*pulse,this.hex(color),.5);const icon=p.type==='shield'?SHIELD_ICON:CORRIDOR_ICON;for(const q of icon)this.rect(p.x+q[0]*3,p.y+q[1]*3,3,3,this.hex(q[2]),.95);}
  particle(p:Particle):void{this.rect(p.x+p.size/2,p.y+p.size/2,p.size,p.size,this.hex(p.color),p.life);}
  ship(ship:Ship,index:number):void{const r=this.textures.shipRegion(index), configW=ship.texture.width*.75,configH=ship.texture.height*.75;this.sprite(r,ship.x,ship.y,configW,configH,ship.rotation,1);}
  laser(a:Asteroid,b:Asteroid,phase:number):void{const alpha=.4+.3*Math.sin(phase);this.line(a.x,a.y,b.x,b.y,this.hex('#ef4444'),alpha*.3,7);this.line(a.x,a.y,b.x,b.y,this.hex('#f87171'),alpha*.6,3);this.line(a.x,a.y,b.x,b.y,this.hex('#fecaca'),alpha+.2,1);this.rect(a.x,a.y,6,6,this.hex('#ef4444'),.8);this.rect(b.x,b.y,6,6,this.hex('#ef4444'),.8);}
  arm(a:Asteroid,phase:number):void{if(!a.arm)return;const x=a.x+Math.cos(a.arm.angle)*a.arm.length,y=a.y+Math.sin(a.arm.angle)*a.arm.length,alpha=.5+.2*Math.sin(phase);this.line(a.x,a.y,x,y,this.hex('#f97316'),alpha*.3,8);this.line(a.x,a.y,x,y,this.hex('#fbbf24'),alpha+.3,3);this.line(a.x,a.y,x,y,this.hex('#fef3c7'),.9,1);this.rect(x,y,8,8,this.hex('#fbbf24'),1);this.rect(x,y,4,4,this.hex('#fef3c7'),1);}
  ion(x:number,y:number,w:number,h:number,label:string,phase:number):void{this.rect(x+w/2,y+h/2,w,h,this.hex('#7c3aed'),.07+.02*Math.sin(phase));this.line(x,y,x+w,y,this.hex('#a78bfa'),.35);this.line(x,y+h,x+w,y+h,this.hex('#a78bfa'),.35);this.sprite(this.textures.regions.get(`label:${label}`)!,x+w/2,y+h/2,90,16,0,.2);}
  corridor():void{const c=LOGICAL_HEIGHT/2,h=LOGICAL_HEIGHT*.18;this.rect(LOGICAL_WIDTH/2,(c-h)/2,LOGICAL_WIDTH,c-h,this.hex('#10b981'),.05);this.rect(LOGICAL_WIDTH/2,(c+h+LOGICAL_HEIGHT)/2,LOGICAL_WIDTH,LOGICAL_HEIGHT-c-h,this.hex('#10b981'),.05);this.line(0,c-h,LOGICAL_WIDTH,c-h,this.hex('#34d399'),.35);this.line(0,c+h,LOGICAL_WIDTH,c+h,this.hex('#34d399'),.35);}
  shield(ship:Ship,phase:number):void{this.ring(ship.x,ship.y,Math.max(ship.width,ship.height)*.55*(1+.08*Math.sin(phase)),this.hex('#22d3ee'),.38);for(let i=0;i<16;i++){const a=i/16*TAU+phase*.5;this.rect(ship.x+Math.cos(a)*ship.width*.3,ship.y+Math.sin(a)*ship.width*.3,3,3,this.hex(i%2?'#67e8f9':'#22d3ee'),.5);}}
  private gradient(top:number[],bottom:number[]):void{const v:CVertex[]=[[0,0,...top,1],[LOGICAL_WIDTH,0,...top,1],[LOGICAL_WIDTH,LOGICAL_HEIGHT,...bottom,1],[0,0,...top,1],[LOGICAL_WIDTH,LOGICAL_HEIGHT,...bottom,1],[0,LOGICAL_HEIGHT,...bottom,1]] as CVertex[];this.submitColor(v);}
  private rect(x:number,y:number,w:number,h:number,color:number[],alpha:number):void{this.quad(x,y,w,h,0,alpha,color);}
  private line(ax:number,ay:number,bx:number,by:number,color:number[],alpha:number,width=1):void{const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;this.quad((ax+bx)/2,(ay+by)/2,len,width,Math.atan2(dy,dx),alpha,color);}
  private ring(cx:number,cy:number,r:number,color:number[],alpha:number):void{const n=24,v:number[]=[];for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;v.push(...this.vertex(cx+Math.cos(a)*r,cy+Math.sin(a)*r,color,alpha),...this.vertex(cx+Math.cos(b)*r,cy+Math.sin(b)*r,color,alpha));}this.submitColor(v);}
  private ellipse(cx:number,cy:number,rx:number,ry:number,color:number[],alpha:number):void{const n=32,v:number[]=[];for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;v.push(...this.vertex(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,color,alpha),...this.vertex(cx+Math.cos(b)*rx,cy+Math.sin(b)*ry,color,alpha));}this.submitColor(v);}
  private wave(y:number,p:number,color:number[],alpha:number):void{for(let x=0;x<LOGICAL_WIDTH;x+=12)this.line(x,y+Math.sin(x*.012+p)*22,x+12,y+Math.sin((x+12)*.012+p)*22,color,alpha);}
  private poly(points:number[][],color:number[],alpha:number):void{for(let i=1;i<points.length-1;i++)this.submitColor([...this.vertex(points[0][0],points[0][1],color,alpha),...this.vertex(points[i][0],points[i][1],color,alpha),...this.vertex(points[i+1][0],points[i+1][1],color,alpha)]);}
  private quad(x:number,y:number,w:number,h:number,rot:number,alpha:number,color:number[]):void{const c=Math.cos(rot),s=Math.sin(rot),hw=w/2,hh=h/2,p=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(q=>[x+q[0]*c-q[1]*s,y+q[0]*s+q[1]*c]);for(const i of [0,1,2,0,2,3])this.colors.push(...this.vertex(p[i][0],p[i][1],color,alpha));}
  private vertex(x:number,y:number,color:number[],a:number):number[]{return [x,y,color[0],color[1],color[2],a];}
  private sprite(r:TextureRegion,x:number,y:number,w:number,h:number,rot:number,alpha:number):void{if(!r)return;const c=Math.cos(rot),s=Math.sin(rot),hw=w/2,hh=h/2,p=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(q=>[x+q[0]*c-q[1]*s,y+q[0]*s+q[1]*c]),uv=[[r.u0,r.v0],[r.u1,r.v0],[r.u1,r.v1],[r.u0,r.v1]];for(const i of [0,1,2,0,2,3])this.texels.push(p[i][0],p[i][1],uv[i][0],uv[i][1],alpha);this.flushColor();this.submitTexture();}
  private submitColor(v:number[]|CVertex[]):void{const flat=typeof v[0]==='number'?v as number[]:(v as CVertex[]).flatMap(x=>x);this.flushTextureOnly();this.colors.push(...flat);}
  private flushColor():void{if(!this.colors.length)return;const gl=this.gl;gl.useProgram(this.colorProgram);gl.uniform2f(this.colorLoc,LOGICAL_WIDTH,LOGICAL_HEIGHT);gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.colors),gl.STREAM_DRAW);gl.enableVertexAttribArray(this.colorPos);gl.vertexAttribPointer(this.colorPos,2,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(this.colorAttr);gl.vertexAttribPointer(this.colorAttr,4,gl.FLOAT,false,24,8);gl.drawArrays(gl.TRIANGLES,0,this.colors.length/6);this.colors.length=0;}
  private submitTexture():void{this.flushColor();this.flushTextureOnly();}
  private flushTextureOnly():void{if(!this.texels.length)return;const gl=this.gl;gl.useProgram(this.texProgram);gl.uniform2f(this.texLoc,LOGICAL_WIDTH,LOGICAL_HEIGHT);gl.uniform1i(this.texSampler,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures.texture);gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.texels),gl.STREAM_DRAW);gl.enableVertexAttribArray(this.texPos);gl.vertexAttribPointer(this.texPos,2,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(this.texAlpha);gl.vertexAttribPointer(this.texAlpha,1,gl.FLOAT,false,20,16);gl.enableVertexAttribArray(this.texUv);gl.vertexAttribPointer(this.texUv,2,gl.FLOAT,false,20,8);gl.drawArrays(gl.TRIANGLES,0,this.texels.length/5);this.texels.length=0;}
  private flush():void{this.flushColor();this.submitTexture();}
  private program(vs:string,fs:string):WebGLProgram{const gl=this.gl,compile=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'shader error');return s;};const p=gl.createProgram()!;gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'program error');return p;}
  private hex(hex:string):number[]{if(hex.startsWith('rgb')){const n=hex.match(/\d+/g)!.map(Number);return[n[0]/255,n[1]/255,n[2]/255];}const h=hex.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];}
}
const SHIELD_ICON:[number,number,string][]=[[-1,-3,'#22d3ee'],[0,-4,'#06b6d4'],[1,-3,'#22d3ee'],[-2,-2,'#06b6d4'],[0,-2,'#0e7490'],[2,-2,'#06b6d4'],[-3,-1,'#22d3ee'],[0,0,'#67e8f9'],[3,-1,'#22d3ee'],[-2,1,'#06b6d4'],[0,2,'#0e7490'],[2,1,'#06b6d4'],[0,4,'#06b6d4']];
const CORRIDOR_ICON:[number,number,string][]=[[-1,-3,'#10b981'],[0,-4,'#34d399'],[1,-3,'#10b981'],[-3,0,'#10b981'],[-1,0,'#6ee7b7'],[0,0,'#a7f3d0'],[1,0,'#6ee7b7'],[3,0,'#10b981'],[-1,3,'#10b981'],[0,4,'#34d399'],[1,3,'#10b981']];
