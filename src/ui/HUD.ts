import { SHIPS, type PlayableKind } from '../data/ships';
import { DIFFICULTIES } from '../data/difficulty';
import { HangarPreview } from './HangarPreview';
export class HUD {
  readonly menu=document.getElementById('menu')!; readonly gameOver=document.getElementById('game-over')!; readonly pause=document.getElementById('pause-overlay')!; readonly hud=document.getElementById('hud')!; readonly touch=document.getElementById('touch-controls')!; readonly rotate=document.getElementById('rotate-overlay')!; readonly ability=document.getElementById('ability-hud')!; readonly sectorOverlay=document.getElementById('sector-overlay')!;
  readonly field=document.getElementById('field-button') as HTMLButtonElement; readonly pauseButton=document.getElementById('pause-button') as HTMLButtonElement; readonly sound=document.getElementById('sound-button') as HTMLButtonElement; readonly score=document.getElementById('score')!; readonly best=document.getElementById('best')!; readonly sector=document.getElementById('sector')!; readonly nitroFill=document.getElementById('nitro-fill') as HTMLElement; readonly shieldFill=document.querySelector('#shield-meter i') as HTMLElement; readonly corridorFill=document.querySelector('#corridor-meter i') as HTMLElement;
  private readonly hangarPreview: HangarPreview;
  constructor(onSelect:(i:number)=>void,onDifficulty:(i:number)=>void){
    this.hangarPreview=new HangarPreview(document.getElementById('hangar-preview') as HTMLCanvasElement);
    const holder=document.getElementById('ship-selector')!;
    SHIPS.forEach((s,i)=>{const b=document.createElement('button');b.className='ship-button'+(i===0?' selected':'');b.type='button';b.textContent=s.name;b.addEventListener('click',()=>{holder.querySelectorAll('button').forEach((x,j)=>x.classList.toggle('selected',j===i));this.hangarPreview.select(i);this.updateHangarLabel(i);onSelect(i);});holder.append(b);});
    const difficulty=document.getElementById('difficulty-selector')!;
    DIFFICULTIES.forEach((d,i)=>{const b=document.createElement('button');b.className='difficulty-button'+(i===1?' selected':'');b.type='button';b.textContent=d.name;b.addEventListener('click',()=>{difficulty.querySelectorAll('button').forEach((x,j)=>x.classList.toggle('selected',j===i));onDifficulty(i);});difficulty.append(b);});
    this.setDescription(0);this.setDifficultyDescription(1);this.updateHangarLabel(0);
  }
  private updateHangarLabel(index:number):void{const config=SHIPS[index]!;document.getElementById('hangar-preview-name')!.textContent=config.name;document.getElementById('hangar-preview-kind')!.textContent=config.kind==='character'?'SPECIAL OPERATIVE':'SPACECRAFT';}
  setDescription(index:number):void{document.getElementById('ship-description')!.textContent=SHIPS[index]!.description;}
  setDifficultyDescription(index:number):void{document.getElementById('difficulty-description')!.textContent=DIFFICULTIES[index]!.description;}
  setStatePlaying(playing:boolean):void{this.menu.classList.toggle('hidden',playing);this.hud.classList.toggle('hidden',!playing);this.touch.classList.toggle('hidden',!playing);this.ability.classList.toggle('hidden',!playing);this.hangarPreview.setVisible(!playing);}
  setScore(score:number,best:number,sector:number):void{this.score.textContent=String(score);this.best.textContent=String(best);this.sector.textContent=String(sector);}
  setNitro(value:number,active:boolean):void{this.nitroFill.style.width=`${value}%`;this.nitroFill.dataset.active=active?'1':'0';}
  setAbilities(shield:number,corridor:number,ready:boolean,active:boolean,cooldown:number):void{this.shieldFill.style.width=`${Math.max(0,shield)*100}%`;this.corridorFill.style.width=`${Math.max(0,corridor)*100}%`;this.field.className='hud-button '+(active?'active':ready?'ready':'cooldown');this.field.textContent=active?'FIELD: ON':cooldown>0?`FIELD: ${Math.ceil(cooldown/60)}s`:'FIELD [F]';}
  showPause(value:boolean):void{this.pause.classList.toggle('hidden',!value);}
  showGameOver(score:number,sector:number,newBest:boolean,best:number):void{(document.getElementById('final-score')!).textContent=`${score}m`;(document.getElementById('final-sector')!).textContent=String(sector);(document.getElementById('final-best')!).textContent=`${best}m`;document.getElementById('best-stat')!.classList.toggle('hidden',!newBest);this.gameOver.classList.remove('hidden');this.hud.classList.add('hidden');this.touch.classList.add('hidden');this.ability.classList.add('hidden');}
  showSector(sector:number,name:string,color:string):void{(document.getElementById('sector-title')!).textContent=`SECTOR ${sector}`;(document.getElementById('sector-subtitle')!).textContent=name;(document.getElementById('sector-title') as HTMLElement).style.textShadow=`0 0 20px ${color}88,2px 2px #000`;this.sectorOverlay.classList.remove('hidden');window.setTimeout(()=>this.sectorOverlay.classList.add('hidden'),2000);}
  setMute(value:boolean):void{this.sound.textContent=value?'SOUND: OFF [M]':'SOUND: ON [M]';}
  orientation():void{const nativeApp=Boolean((window as Window & {Capacitor?:unknown}).Capacitor);const landscape=window.innerWidth/window.innerHeight>=1.2;this.rotate.classList.toggle('hidden',nativeApp||landscape);}
}
