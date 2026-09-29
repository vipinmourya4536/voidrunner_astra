export type Arm = { length:number; angle:number; speed:number };
export type Asteroid = {
  id:number; x:number; y:number; radius:number; rotation:number; rotSpeed:number;
  foreground:boolean; parallax:number; seed:number; arm?:Arm;
};
export type PowerUpType = 'shield'|'corridor';
export type PowerUp = { type:PowerUpType; x:number; y:number; radius:number; phase:number };
