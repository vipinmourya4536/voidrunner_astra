# Performance plan

- WebGL2 is primary; colored quads are streamed in small batches and ship/rock textures use nearest filtering.
- Ship art is converted once to a texture. Rock textures are deterministic and cached by biome, foreground/background class, radius bucket and seed.
- Particles are bounded at 900 entries and short-lived effects are reused through a hard budget/drop policy.
- The simulation is fixed at 60 Hz with max five catch-up steps. A hidden tab is paused rather than allowed to spiral.
- HUD values are retained DOM nodes and are updated from simulation state, not from each render call's layout path.
- QualityManager uses a 60-sample moving average and changes render scale in sustained stages. It never changes collision, timers, spawn fairness or physics.
- Audio has a master gain and one cancellable music scheduler. AudioContext creation occurs after the first user gesture.

## Test matrix

Use `npm run build`, `npm test`, and a production preview on low/mid/high Android hardware at 60/90/120 Hz and 720p/1080p-class logical displays. Compare gameplay counters and seeded runs, not only visual FPS. Capture FPS, frame time, internal render scale, active asteroids, hazards and particles with `?debug=1`.

The repository workflow produces `voidrunner-debug-apk` for direct installation. The AAB artifact is intentionally unsigned; release signing credentials are not stored in the repository.
