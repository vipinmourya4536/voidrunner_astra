export type ShipConfig = {
  name: string; description: string; gravity: number; thrust: number; maxSpeed: number;
  worldSpeedMod: number; dampening: number; thrustParticles: number;
  exhaust: { x: number; y: number }[]; exhaustColor: string; nitroColor: string;
  tiltRange: number; tiltSpeed: number; bounce?: boolean; pixelSize: number; art: string[];
};

export const PIXEL_PALETTE: Record<string, string | null> = {
  W:'#ffffff', w:'#e5e7eb', L:'#d1d5db', l:'#b0b3b8', G:'#9ca3af', g:'#6b7280', D:'#4b5563', d:'#374151',
  X:'#1f2937', x:'#111827', K:'#030712', k:'#0a0e18', B:'#2563eb', b:'#3b82f6', I:'#60a5fa', i:'#93c5fd',
  C:'#06b6d4', c:'#22d3ee', O:'#ea580c', o:'#f97316', R:'#ef4444', r:'#f87171', Y:'#eab308', y:'#facc15',
  P:'#fef08a', E:'#10b981', e:'#34d399', T:'#0f172a', V:'#7c3aed', v:'#a78bfa', _: null
};

export type ShipPixel = { x: number; y: number; size: number; color: string };
export type ShipTexture = { width: number; height: number; pixelSize: number; pixels: ShipPixel[] };

export function parseShipArt(art: string[], pixelSize: number): ShipTexture {
  const width = Math.max(...art.map(row => row.length)) * pixelSize;
  const pixels: ShipPixel[] = [];
  art.forEach((row, y) => [...row].forEach((ch, x) => {
    const color = PIXEL_PALETTE[ch];
    if (color) pixels.push({ x: x * pixelSize - width / 2, y: y * pixelSize - art.length * pixelSize / 2, size: pixelSize, color });
  }));
  return { width, height: art.length * pixelSize, pixelSize, pixels };
}

export const SHIPS: readonly ShipConfig[] = [
  {
    name:'PIONEER', description:'STRIKE FIGHTER: Aggressive profile with dual wing engines. Reliable and punchy.',
    gravity:.21, thrust:-.44, maxSpeed:6.5, worldSpeedMod:1, dampening:.978, thrustParticles:3,
    exhaust:[{x:-.50,y:-.32},{x:-.50,y:.32}], exhaustColor:'#f97316', nitroColor:'#60a5fa', tiltRange:.35, tiltSpeed:.045, pixelSize:2.5,
    art:[
      '__________KKKK______________','_________KIiBBK_____________','________KIiTTBlK____________','_______KGlBBWWWlKK__________',
      '______KDGlWWWWWWWWlKK_______','_KK__KDDGllWWWWWWWWWWlK_____','KoRKKDDDGlWWWWWWWWWWWWWlK___','KRYRKXDDGlWWWWWWWWWWWWWWlK__',
      'KoRKKXDDDDDDDDDDDDDDDDDDDloK','KKKKXXDDDDDcCcDDcCcDDDDDDDoK','KoRKKXDDDDDDDDDDDDDDDDDDDloK','KRYRKXDDGlWWWWWWWWWWWWWWlK__',
      'KoRKKDDDGlWWWWWWWWWWWWWlK___','_KK__KDDGllWWWWWWWWWWlK_____','______KDGlWWWWWWWWlKK_______','_______KGlBBWWWlKK__________',
      '________KIiTTBlK____________','_________KIiBBK_____________','__________KKKK______________'
    ]
  },
  {
    name:'APEX', description:'INTERCEPTOR: Needle-nose design with massive engine pods. Blazing fast, for aces only.',
    gravity:.27, thrust:-.56, maxSpeed:8, worldSpeedMod:1.25, dampening:.955, thrustParticles:4,
    exhaust:[{x:-.44,y:-.38},{x:-.44,y:.38}], exhaustColor:'#ef4444', nitroColor:'#c084fc', tiltRange:.50, tiltSpeed:.07, pixelSize:1.8,
    art:[
      '_________________________KKK','________________________KrrRK','_______________________KrWWrK','______________________KDlWWlDK',
      '_____________________KDlWBWlDK','____________________KGlWBTBlGK','___________________KGGllBBllGGK','__________________KDGGGGGGGGGDdK',
      '_________________KDDDDDDDDDDDDDdK','____KK__________KXDDDDDDDDDDDDDoK','___KRRK________KXXDDDDDDDDDDDDDoK','__KRrYrK______KXXDDDDDDDDDDDDDDoK',
      '_KRYPPYrK____KXXDDDDDDDDDDDDDDDoK','__KRrYrK______KXXDDDDDDDDDDDDDDoK','___KRRK________KXXDDDDDDDDDDDDDoK','____KK__________KXDDDDDDDDDDDDDoK',
      '_________________KDDDDDDDDDDDDDdK','__________________KDGGGGGGGGGDdK','___________________KGGllBBllGGK','____________________KGlWBTBlGK',
      '_____________________KDlWWlDK','______________________KDlWWlDK','_______________________KrWWrK','________________________KrrRK','_________________________KKK'
    ]
  },
  {
    name:'SAUCER', description:'ANTI-GRAV: Fluid and bouncy. Floats like a dream with smooth oscillating thrust.',
    gravity:.10, thrust:-.22, maxSpeed:4.5, worldSpeedMod:.95, dampening:.985, thrustParticles:2,
    exhaust:[{x:-.15,y:.45},{x:.15,y:.45}], exhaustColor:'#eab308', nitroColor:'#22d3ee', tiltRange:.06, tiltSpeed:.012, bounce:true, pixelSize:1.8,
    art:[
      '________________KKKKKKKKKK________________','______________KKIiiiiiiiiiIKK______________','____________KKIiiBBBBBBBBiiIKK____________','___________KIiiBBBBBBBBBBBBiiIK___________',
      '__________KIiiBBBTTTTTTBBBBBiiIK__________','_________KIiiBBBTTTTTTTTBBBBBiiIK_________','________KIiiBBBBTTTTTTTBBBBBBBiiIK________','_______KIiiiBBBBBBBBBBBBBBBBBBBiiiIK______',
      '______KKllllllllllllllllllllllllllllKK_____','_____KGlLLLLLLLLLLLLLLLLLLLLLLLLLLlGK____','___KKGlLLLLLLLLLLLLLLLLLLLLLLLLLLLLlGKK__','__KGGlLLELLoLLCLLGLLELLoLLCLLGLLELLLlGGK_',
      '_KDGGlllllllllllllllllllllllllllllllllGGDK_','KXDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDXK__','KXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDXxK','_KXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDXxK_',
      '__KXXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDXXxK__','___KKXXXDDDDDDDDDDDDDDDDDDDDDDDDDDXXXKK___','_____KKXXXXXXDDDDDDDDDDDDDDDDXXXXXxKK_____','_______KKKXXXXXXXXXXXXXXXXXXXXxKKK_______',
      '_________KKKyYYoOOoOOoOOoYYyKKK___________','___________KKyYYoOOoOOoYYyKK______________','_____________KKyYYYYYYYyKK________________','_______________KKyyyyyyKK_________________','_________________KKKKKK___________________'
    ]
  },
  {
    name:'TITAN', description:'DREADNOUGHT: Colossal hull, crushing weight. Like piloting a mountain through space.',
    gravity:.40, thrust:-.72, maxSpeed:9, worldSpeedMod:.65, dampening:.96, thrustParticles:6,
    exhaust:[{x:-.42,y:-.28},{x:-.42,y:-.09},{x:-.42,y:.09},{x:-.42,y:.28}], exhaustColor:'#0ea5e9', nitroColor:'#f97316', tiltRange:.08, tiltSpeed:.008, pixelSize:1.6,
    art:[
      '____________________KKKKKKKKKK___________________','___________________KDDDDDDDDDDdK__________________','__________________KDDDDDDDDDDDDDdK_________________','_________________KDDGGGGGGGGGGGDDdK________________',
      '________________KDGGllllllllllllGGDdK_______________','_______________KDGlWWWWWWWWWWWWWWlGDdK______________','______________KDGlWWWWWWWWWWWWWWWWlGDdK_____________','_____________KDGlWWWWWBBBBBBBWWWWWWlGDdK____________',
      '____________KDGlWWWWWBTTTTTTTBWWWWWWlGDdK___________','___________KDGlWWWWWWBTTTTTTTBWWWWWWWlGDdK__________','__________KDGlWWWWWWWBBBBBBBBWWWWWWWWWlGDdK_________','_________KDGGlWWWWWWWWWWWWWWWWWWWWWWWWlGGDdK________',
      '________KDGGllllllllllllllllllllllllllllGGDdK_______','_______KDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDdK______','______KXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK_____','_____KXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK____',
      '____KXDDlCClDDlCClDDlCClDDlCClDDlCClDDlCClDDdK___','___KXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK__','_KKKKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK_','KcCcKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK_',
      'KCIICKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK','KIiiIKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK','KIiiIKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK','KCIICKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK',
      'KcCcKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK_','_KKKKXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDoK_','___KXXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK__','____KXDDlCClDDlCClDDlCClDDlCClDDlCClDDlCClDDdK___',
      '_____KXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK____','______KXDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdK_____','_______KDDGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGDDdK______','________KDGGllllllllllllllllllllllllllllGGDdK_______',
      '_________KDGGlWWWWWWWWWWWWWWWWWWWWWWWWlGGDdK________','__________KDGlWWWWWWWWWWWWWWWWWWWWWWWWlGDdK_________','___________KDGlWWWWWWBBBBBBBWWWWWWWWlGDdK__________','____________KDGlWWWWBTTTTTTTBWWWWWlGDdK_____________',
      '_____________KDGlWWWBTTTTTTTBWWWWlGDdK______________','______________KDGGlWWBBBBBBBWWWlGGDdK_______________','_______________KDGGllllllllllllGGDdK________________','________________KDDGGGGGGGGGGGDDdK_________________',
      '_________________KDDDDDDDDDDDDDdK__________________','__________________KKKKKKKKKKKKKKK___________________'
    ]
  }
];
