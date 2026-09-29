export class InputController {
  thrust=false; nitro=false; private pointers=new Map<number,'thrust'|'nitro'>();
  onField:()=>void=()=>{}; onPause:()=>void=()=>{}; onMute:()=>void=()=>{};
  private target:HTMLElement;
  constructor(target:HTMLElement){this.target=target;this.bind();}
  private bind():void {
    window.addEventListener('keydown',e=>{if(e.code==='KeyP'){e.preventDefault();this.onPause();return;}if(e.code==='KeyM'){e.preventDefault();this.onMute();return;}if(e.code==='KeyF'){e.preventDefault();this.onField();return;}if(e.code==='Space'||e.code==='ArrowLeft')this.thrust=true;if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='ArrowRight')this.nitro=true;});
    window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowLeft')this.thrust=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='ArrowRight')this.nitro=false;});
    this.target.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button'))return;this.target.setPointerCapture(e.pointerId);const side=e.clientX < window.innerWidth/2?'thrust':'nitro';this.pointers.set(e.pointerId,side);this.recompute();});
    const release=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);this.recompute();};
    this.target.addEventListener('pointerup',release);this.target.addEventListener('pointercancel',release);this.target.addEventListener('pointerleave',e=>{if(this.pointers.has(e.pointerId))release(e);});
  }
  private recompute():void {this.thrust=[...this.pointers.values()].includes('thrust');this.nitro=[...this.pointers.values()].includes('nitro');}
  clear():void {this.thrust=false;this.nitro=false;this.pointers.clear();}
}
