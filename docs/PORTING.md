# VoidRunner mobile port

The immutable source of truth is `reference/ship.html`, copied from the supplied attachment (the two supplied files were byte-identical).

## Source inventory

- **UI/state:** `MENU`, `PLAYING`, `PAUSED`, and `GAMEOVER`; ship selector; HUD; field, pause, sound, retry and resume controls; local high score `voidRunnerV7`.
- **Ships:** PIONEER, APEX, SAUCER, TITAN with source physics, exhaust placement/colors, tilt, dimensions and pixel-art strings in `src/data/ships.ts`.
- **Simulation:** frame-oriented gravity/thrust/dampening/clamp; world speed starts at `2.5`; Nitro is `2x`, drains `0.6` and regenerates `0.15` per source frame; distance is `speed * 0.1`.
- **Progression:** sector distance `500`; density `1 + (sector - 1) * .12`; spawn reduction floors at `.6`; all 13 source biome ranges are preserved.
- **Spawning:** moving safe corridor, eight source patterns, shield/corridor probabilities, background rocks, and sector-gated laser, rotating-arm and ion hazards.
- **Power-ups:** 600-frame shield; 600-frame Corridor Clear Field; 1200-frame cooldown; field displaces asteroid bodies but does not remove hazards.
- **Effects:** pooled particles, shield break, explosion, corridor field, stars, biome color transitions and tactical HUD.
- **Audio:** source sound palette and 13 biome note families are retained in `AudioManager`; scheduling uses one cancellable timeout rather than uncontrolled per-frame nodes.

## Mobile differences

The original screen-pixel world is normalized to a 1280x720 logical world. Simulation runs at 60 Hz through an accumulator, while WebGL resolution can scale independently. Pointer Events use left-half thrust and right-half Nitro, with dedicated large Field/Pause controls. Backgrounding pauses the game and prevents a large catch-up jump.

The port intentionally keeps HTML only for menus/HUD. Gameplay objects are rendered through a WebGL2 batch path and cached textures. If WebGL2 is unavailable, the game reports a renderer error instead of silently falling back to a slower, divergent implementation.
