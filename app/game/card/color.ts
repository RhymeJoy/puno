/**
 * An enum with 5 card colors.
 * @enum {number}
 */
export const Color = {
  WILD: 0,
  RED: 1,
  YELLOW: 2,
  GREEN: 3,
  BLUE: 4
} as const;

export type ColorId = typeof Color[keyof typeof Color];

(globalThis as any).Color = Color;
