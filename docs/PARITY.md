# Parity checklist

| Original behavior | Mobile implementation | Status |
|---|---|---|
| Four ships and source physics | `src/data/ships.ts`, `Ship.ts` | Implemented |
| Pixel-art ship designs | Cached nearest-neighbor WebGL textures | Implemented |
| Left thrust/right Nitro touch model | Pointer Events with pointer capture | Implemented |
| Fixed source frame behavior | 60 Hz accumulator | Implemented |
| Nitro 2x/drain/regeneration | `Ship.update` | Implemented |
| 500m sectors and 13 biomes | `SectorManager`, `biomes.ts` | Implemented |
| Safe corridor and eight patterns | `SpawnManager` | Implemented |
| Shield and Corridor Clear | `Game` effects state | Implemented |
| Laser connectors | `HazardManager` segment collision | Implemented |
| Rotating arms | `HazardManager` segment collision | Implemented |
| Ion invert/reduced thrust | `HazardManager` + `Ship` | Implemented |
| Pooled particles and explosion | `ParticleSystem` | Implemented |
| Web Audio SFX/biome music families | `AudioManager` | Implemented |
| Local best score `voidRunnerV7` | `SaveManager` | Implemented |
| Pause/background lifecycle | state machine + visibility listener | Implemented |
| Android landscape packaging | Capacitor config and scripts | Configured |
| Full source biome-specific canvas art | WebGL equivalents for source motifs | Optimized equivalent; visual review required |

This checklist distinguishes behavioral parity from visual equivalence. Device profiling and screenshot comparison are still required before publishing an APK.
