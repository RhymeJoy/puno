export const Mode = {
  TRADITIONAL: 0,
  BATTLE_PUNO: 1,
  DEATH_MATCH: 2,
  TIMED: 3
} as const;

export type ModeId = typeof Mode[keyof typeof Mode];

(globalThis as any).Mode = Mode;
