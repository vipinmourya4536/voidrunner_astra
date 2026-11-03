# Architecture

```text
src/
  core/        fixed timestep, state machine, RNG, game orchestration
  data/        source ships and biome definitions
  player/      ship physics and collision model
  world/       sector progression and safe-corridor wave spawning
  entities/    asteroid, power-up and particle data structures
  hazards/     laser connectors, rotating arms, ion zones
  effects/     pooled particle system
  rendering/   WebGL2 renderer and deterministic texture cache
  input/       keyboard plus Pointer Events touch controller
  audio/       Web Audio sound/music scheduler
  storage/     local high-score/mute persistence
  ui/          retained DOM HUD/menu updates
  performance/ quality scaler
```

Simulation owns all state mutation. Rendering consumes state only. All timers which affect gameplay are logical 60 Hz counters. Browser time is used only by the fixed-step accumulator. Random world generation uses independent seeded streams; hot rendering paths do not call `Math.random()`.

The Android shell is Capacitor. `npm run cap:sync` builds the offline web bundle and copies it into the native project; no CDN or server is required at runtime. `.github/workflows/android.yml` builds a debug APK and unsigned release AAB on Java 17 for device testing and later signing.
