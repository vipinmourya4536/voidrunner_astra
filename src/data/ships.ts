export type AvatarStyle = 'purrjector' | 'nimbus' | 'webslinger';
export type PlayableKind = 'ship' | 'character';

type SharedPlayableConfig = {
  id: string; name: string; description: string; gravity: number; thrust: number; maxSpeed: number;
  worldSpeedMod: number; dampening: number; thrustParticles: number;
  exhaust: { x: number; y: number }[]; exhaustColor: string; nitroColor: string;
  tiltRange: number; tiltSpeed: number; bounce?: boolean; pixelSize: number; art: string[];
  fieldDurationMultiplier?: number; fieldCooldownMultiplier?: number;
};

/** One deterministic physics contract for ships and avatars, with a type-safe visual dispatch. */
export type ShipConfig = SharedPlayableConfig & (
  | { kind: 'ship'; avatarStyle?: undefined }
  | { kind: 'character'; avatarStyle: AvatarStyle }
);

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

/** Kept separate so the Wraith's narrow reconnaissance silhouette stays compact at phone scale. */
export const WRAITH_ART = [
  '______________KK__','_____________KiiK_','____________KICcK_','___________KIBBcK_','__________KIBTTBcK',
  '_____KK__KIDDGGDK_','____KccKKXDDDDDDK_','KKKKKIIIXDDDDDDDK_','____KccKKXDDDDDDK_','_____KK__KIDDGGDK_',
  '__________KIBTTBcK','___________KIBBcK_','____________KICcK_','_____________KiiK_','______________KK__'
];

export const SHIPS: readonly ShipConfig[] = [
  {
    id:'pioneer', kind:'ship', name:'PIONEER', description:'STRIKE FIGHTER: Aggressive profile with dual wing engines. Reliable and punchy.',
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
    id:'apex', kind:'ship', name:'APEX', description:'INTERCEPTOR: Needle-nose design with massive engine pods. Blazing fast, for aces only.',
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
    id:'saucer', kind:'ship', name:'SAUCER', description:'ANTI-GRAV: Fluid and bouncy. Floats like a dream with smooth oscillating thrust.',
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
    id:'wraith', kind:'ship', name:'WRAITH', description:'RECON CRAFT: Razor fins and a precise cyan drive. Responsive, agile and built for tight routes.',
    gravity:.19, thrust:-.49, maxSpeed:7.1, worldSpeedMod:1.10, dampening:.968, thrustParticles:3,
    exhaust:[{x:-.48,y:-.24},{x:-.48,y:.24}], exhaustColor:'#22d3ee', nitroColor:'#93c5fd', tiltRange:.42, tiltSpeed:.060, pixelSize:1.6,
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
  },
  {
    id:'helix', kind:'ship', name:'HELIX', description:'FIELD WEAVER: Asymmetric energy core extends Clear Field duration and shortens recovery.',
    gravity:.16, thrust:-.34, maxSpeed:5.8, worldSpeedMod:.98, dampening:.980, thrustParticles:3,
    exhaust:[{x:-.43,y:-.31},{x:-.35,y:.30}], exhaustColor:'#34d399', nitroColor:'#22d3ee', tiltRange:.22, tiltSpeed:.030, pixelSize:2.5,
    fieldDurationMultiplier:1.25, fieldCooldownMultiplier:.72,
    art:[
      '____________KK____','___________KccK___','__________KCEcK___','_________KCDDEK___','_____KK_KCDVVDEK__','____KccKXDDVVDDK__','___KCEEXDDVVDDDDK_','KKKCDDDDDDEEDDDDK_','___KCEEXDDVVDDDDK_','____KccKXDDVVDDK__','_____KK_KCDVVDEK__','_________KCDDEK___','__________KCEcK___','___________KccK___','____________KK____'
    ]
  },
  {
    id:'purrjector', kind:'character', name:'PURRJECTOR', description:'COSMIC CAT: A helmeted feline with a tail flick, a tiny blink, and a very impolite boost cloud.',
    gravity:.17, thrust:-.38, maxSpeed:6.1, worldSpeedMod:1.02, dampening:.976, thrustParticles:3,
    exhaust:[{x:-.52,y:.20},{x:-.45,y:.34}], exhaustColor:'#a3e635', nitroColor:'#bef264', tiltRange:.19, tiltSpeed:.026, pixelSize:2.8, avatarStyle:'purrjector',
    art:[
      '_______KKKK_______','_____KKCccCKK_____','____KCIiiiiICK____','___KCIiWWWWWiiK___','___KCiWKKKKKWiK___','___KCiWKPPPKWiK___','____KiiKPPPKiiK___','_____KiiWWWiKK____','___KKKlllLlKKK____','__KllLlllLllllK___','_KllLllDLLlllLK___','KllLlllLLLLlllLK__','KllLllLKKKlllLLK__','_KllLKK___KKllK___','__KKK_______KKK___'
    ]
  },
  {
    id:'goku-nimbus', kind:'character', name:'GOKU + NIMBUS', description:'CLOUD RIDER: Orange martial-artist and golden Nimbus mount. Calm float, brilliant golden boost trail.',
    gravity:.14, thrust:-.31, maxSpeed:5.9, worldSpeedMod:1.04, dampening:.980, thrustParticles:3,
    exhaust:[{x:-.55,y:.12},{x:-.42,y:.30}], exhaustColor:'#facc15', nitroColor:'#fef08a', tiltRange:.15, tiltSpeed:.022, pixelSize:2.8, avatarStyle:'nimbus',
    art:[
      '________KKK_______','_______KkkkkK_____','______KkKKKkkK____','______KkPWPkkK____','_______KWWWWK_____','______KOOOOOOK____','_____KOOOBOOOK____','_____KOOOBBOOK____','______KOOOooK_____','___KKYYYYYYYYKK___','_KKYyyYYYYYyyYK___','KYYyYYyYYyYYyYYK__','_KYYYYYYYYYYYYK___','__KKYYYYYYYYKK____','_____KKKKKK_______'
    ]
  },
  {
    id:'spider-man', kind:'character', name:'SPIDER-MAN', description:'WEB SLINGER: A red-and-blue acrobat whose Nitro snaps a web line to a nearby asteroid before the burst.',
    gravity:.20, thrust:-.46, maxSpeed:6.8, worldSpeedMod:1.08, dampening:.970, thrustParticles:3,
    exhaust:[{x:-.30,y:.28},{x:-.45,y:.42}], exhaustColor:'#93c5fd', nitroColor:'#f8fafc', tiltRange:.34, tiltSpeed:.042, pixelSize:2.8, avatarStyle:'webslinger',
    art:[
      '_______KKK_______','______KRRRK______','_____KRrRrRK_____','_____KRWWWRK_____','______KRRRK______','_____KBBBBBK_____','____KBBRBRBBK____','____KBBRBRBBK____','_____KBBRBBK_____','______KBRBK______','_____KBBRBBK_____','____KBB___BBK____','___KBBK___KBBK___','___KKK_____KKK___'
    ]
  }
];

export function shipArt(config: ShipConfig): string[] { return config.name === 'WRAITH' ? WRAITH_ART : config.art; }
