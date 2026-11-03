export type DifficultyConfig = {
  name: 'CADET' | 'STANDARD' | 'VETERAN' | 'NIGHTMARE';
  description: string;
  spawnRate: number;
  safeCorridor: number;
  density: number;
  hazardRate: number;
  speedRamp: number;
};

/** Centralised fairness tuning. Every multiplier is consumed by the simulation. */
export const DIFFICULTIES: readonly DifficultyConfig[] = [
  { name: 'CADET', description: 'WIDER ROUTES · SLOWER ESCALATION', spawnRate: .82, safeCorridor: 1.22, density: .78, hazardRate: .60, speedRamp: .70 },
  { name: 'STANDARD', description: 'BALANCED ARCADE SURVIVAL', spawnRate: 1, safeCorridor: 1, density: 1, hazardRate: 1, speedRamp: 1 },
  { name: 'VETERAN', description: 'TIGHTER FORMATIONS · FASTER PRESSURE', spawnRate: 1.12, safeCorridor: .90, density: 1.14, hazardRate: 1.18, speedRamp: 1.16 },
  { name: 'NIGHTMARE', description: 'EXPERT PILOTS ONLY · FAIR, RELENTLESS', spawnRate: 1.23, safeCorridor: .84, density: 1.25, hazardRate: 1.34, speedRamp: 1.30 },
];
