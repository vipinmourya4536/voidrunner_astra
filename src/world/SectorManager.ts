import { SECTOR_DISTANCE } from '../core/constants';
import { BIOMES, biomeIndexForSector } from '../data/biomes';
export class SectorManager {
  current=1; previousBiome=0; biomeIndex=0; transition=1; overlayTimer=0;
  update(distance:number):{changed:boolean; biomeChanged:boolean} {const next=Math.floor(distance/SECTOR_DISTANCE)+1;let changed=false,biomeChanged=false;if(next!==this.current){this.current=next;changed=true;this.overlayTimer=120;}const nextBiome=biomeIndexForSector(next);if(nextBiome!==this.biomeIndex){this.previousBiome=this.biomeIndex;this.biomeIndex=nextBiome;this.transition=0;biomeChanged=true;}if(this.transition<1)this.transition=Math.min(1,this.transition+1/120);if(this.overlayTimer>0)this.overlayTimer--;return{changed,biomeChanged};}
  reset():void{this.current=1;this.previousBiome=0;this.biomeIndex=0;this.transition=1;this.overlayTimer=0;}
  density():number{return 1+(this.current-1)*.12;}
  spawnReduction():number{return Math.max(.6,1-(this.current-1)*.05);}
  biomeName():string{return BIOMES[this.biomeIndex]!.name;}
}
