import { BoardPiece, OpticalField, PieceColor, Square } from './types';
import { OPTICAL_CONSTANTS, calculateHue } from './colorFormulas';

export interface PiecePaint {
  /** Resulting hue from the blue/red balance of every ray that sees the piece. */
  hue: number;
  /** How strongly the piece body is painted (partial paint, 0..1). */
  strength: number;
  attackers: number;
  defenders: number;
}

export type PiecePaintMap = Partial<Record<Square, PiecePaint>>;

/** Tint lightness: white bodies take a deeper tint, black bodies a lighter one, so both read as painted. */
export const PAINT_TINT_LIGHTNESS: Record<PieceColor, number> = {
  w: 60,
  b: 68
};

export const PAINT_TINT_SATURATION = OPTICAL_CONSTANTS.softPart2Sat;

const PAINT_BASE_STRENGTH = 0.66;
const PAINT_STEP_STRENGTH = 0.06;
const PAINT_MAX_STRENGTH = 0.85;

/**
 * A piece that is seen by at least one ray gets partially painted:
 * defended -> its own team hue, attacked -> the opposing team hue,
 * both -> the resulting green standoff hue. Unseen pieces stay untouched.
 */
export function computePiecePaints(
  pieces: BoardPiece[],
  field: OpticalField | null | undefined
): PiecePaintMap {
  const paints: PiecePaintMap = {};
  if (!field?.rays?.length || pieces.length === 0) return paints;

  const occupants = new Map<Square, BoardPiece>();
  for (const piece of pieces) occupants.set(piece.square, piece);

  const tallies = new Map<
    Square,
    { blue: number; red: number; attackers: number; defenders: number }
  >();

  for (const ray of field.rays) {
    for (const square of ray.path) {
      const occupant = occupants.get(square);
      if (!occupant || occupant.id === ray.sourcePiece.id) continue;

      const tally = tallies.get(square) ?? { blue: 0, red: 0, attackers: 0, defenders: 0 };
      if (ray.sourcePiece.color === occupant.color) {
        tally.defenders += 1;
      } else {
        tally.attackers += 1;
      }
      if (ray.sourcePiece.color === 'w') {
        tally.blue += 1;
      } else {
        tally.red += 1;
      }
      tallies.set(square, tally);
    }
  }

  for (const [square, tally] of tallies) {
    const total = tally.blue + tally.red;
    if (total <= 0) continue;

    paints[square] = {
      hue: calculateHue(tally.blue, tally.red),
      strength: Math.min(
        PAINT_MAX_STRENGTH,
        PAINT_BASE_STRENGTH + PAINT_STEP_STRENGTH * (total - 1)
      ),
      attackers: tally.attackers,
      defenders: tally.defenders
    };
  }

  return paints;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else {
    r = x;
    b = c;
  }

  const channel = (value: number): string =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Hex tint for a paint hue, tuned per body color. */
export function paintTintHex(hue: number, color: PieceColor): string {
  return hslToHex(hue, PAINT_TINT_SATURATION, PAINT_TINT_LIGHTNESS[color]);
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map(char => char + char)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
}

/** Blends `amount` of `tint` into `base` (both hex). */
export function mixHex(base: string, tint: string, amount: number): string {
  const ratio = Math.min(1, Math.max(0, amount));
  const [br, bg, bb] = parseHex(base);
  const [tr, tg, tb] = parseHex(tint);
  const channel = (from: number, to: number): string =>
    Math.round(from + (to - from) * ratio)
      .toString(16)
      .padStart(2, '0');

  return `#${channel(br, tr)}${channel(bg, tg)}${channel(bb, tb)}`;
}
