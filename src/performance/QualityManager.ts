export class QualityManager {
  scale=1; private samples:number[]=[]; private cooldown=0;
  update(frameMs:number):void {this.samples.push(frameMs);if(this.samples.length>60)this.samples.shift();if(this.cooldown>0){this.cooldown--;return;}if(this.samples.length<30)return;const avg=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;if(avg>20&&this.scale>.6){this.scale=Math.max(.6,this.scale-.1);this.cooldown=180;}else if(avg<14&&this.scale<1){this.scale=Math.min(1,this.scale+.1);this.cooldown=300;}}
}
