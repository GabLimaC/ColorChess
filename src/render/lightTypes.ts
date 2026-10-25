import { PieceColor, PieceType, Ray, Square } from '../core/types';
import { OPTICAL_CONSTANTS } from '../core/colorFormulas';

export const BAND_WIDTH = 0.16;
export const CORE_WIDTH = 0.07;
export const DISC_RADIUS = 0.45;
export const KING_FRAME_REACH = 0.72;
export const KNIGHT_RING_WIDTH = 0.6;
export const SHAPE_ALPHA = 0.9;

export type LightShapeSpec =
  | { kind: 'fill'; alpha: number }
  | { kind: 'band'; alpha: number; width: number; angle: number; coreWidth?: number }
  | { kind: 'disc'; alpha: number; radius: number }
  | { kind: 'ring'; alpha: number; width: number; dx: number; dy: number }
  | { kind: 'frame'; alpha: number; reach: number; dx: number; dy: number };

export interface ScreenDirection {
  dx: number;
  dy: number;
}

export const PIECE_DRAW_ORDER: Record<PieceType, number> = {
  p: 0,
  r: 1,
  b: 2,
  q: 3,
  k: 4,
  n: 5,
};

export function screenDirection(
  direction: [number, number],
  flipped: boolean
): ScreenDirection {
  const [df, dr] = direction;
  return {
    dx: flipped ? -df : df,
    dy: flipped ? dr : -dr,
  };
}

export function sideHue(color: PieceColor): number {
  return color === 'w' ? OPTICAL_CONSTANTS.whiteHue : OPTICAL_CONSTANTS.blackHue;
}

export function specsForPiece(type: PieceType, dir: ScreenDirection): LightShapeSpec[] {
  const angle = Math.atan2(dir.dy, dir.dx);

  switch (type) {
    case 'p':
      return [{ kind: 'fill', alpha: SHAPE_ALPHA }];
    case 'r':
    case 'b':
      return [{ kind: 'band', alpha: SHAPE_ALPHA, width: BAND_WIDTH, angle }];
    case 'q':
      return [
        {
          kind: 'band',
          alpha: SHAPE_ALPHA,
          width: BAND_WIDTH,
          angle,
          coreWidth: CORE_WIDTH,
        },
      ];
    case 'n':
      return [
        {
          kind: 'ring',
          alpha: SHAPE_ALPHA,
          width: KNIGHT_RING_WIDTH,
          dx: dir.dx,
          dy: dir.dy,
        },
      ];
    case 'k':
      return [
        {
          kind: 'frame',
          alpha: SHAPE_ALPHA,
          reach: KING_FRAME_REACH,
          dx: Math.sign(dir.dx),
          dy: Math.sign(dir.dy),
        },
      ];
  }
}

export function buildRayIndex(rays: Ray[]): Map<Square, Ray[]> {
  const index = new Map<Square, Ray[]>();

  for (const ray of rays) {
    for (const square of ray.path) {
      const existing = index.get(square);
      if (existing) {
        existing.push(ray);
      } else {
        index.set(square, [ray]);
      }
    }
  }

  return index;
}

/**
 * Normalized rectangle (0..1 of the square) covered by a king frame in the
 * square reached along screen direction (dx, dy). The rectangle is anchored on
 * the edge/corner touching the king and extends `reach` outward, stopping short
 * of the far edge so the eight neighbours form a thick square ring.
 */
export function frameRect(
  dx: number,
  dy: number,
  reach: number
): { x: number; y: number; w: number; h: number } {
  const x0 = dx > 0 ? 0 : dx < 0 ? 1 - reach : 0;
  const x1 = dx > 0 ? reach : 1;
  const y0 = dy > 0 ? 0 : dy < 0 ? 1 - reach : 0;
  const y1 = dy > 0 ? reach : 1;

  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}