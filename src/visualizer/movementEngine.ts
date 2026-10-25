import { OPTICAL_CONSTANTS } from '../core/colorFormulas';
import { InfluenceResult, SquareInfluence, VFile, VRank, VSquare, VisualPiece } from './types';

export const V_BOARD_SIZE = 16;

export const SLIDER_MAX_RANGE = 8;

export const MAX_TEMPO = 3;

export const V_FILES: readonly VFile[] = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
  'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'
];

export const V_RANKS: readonly VRank[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
];

export const ALL_V_SQUARES: VSquare[] = [];
for (const file of V_FILES) {
  for (const rank of V_RANKS) {
    ALL_V_SQUARES.push(`${file}${rank}` as VSquare);
  }
}

const KNIGHT_OFFSETS: Array<[number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2]
];

const KING_OFFSETS: Array<[number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1]
];

const DIAGONAL_DIRECTIONS: Array<[number, number]> = [
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

const ORTHOGONAL_DIRECTIONS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

const SLIDER_DIRECTIONS: Record<'b' | 'r' | 'q', Array<[number, number]>> = {
  b: DIAGONAL_DIRECTIONS,
  r: ORTHOGONAL_DIRECTIONS,
  q: [...DIAGONAL_DIRECTIONS, ...ORTHOGONAL_DIRECTIONS]
};

export function vSquareToFileRank(square: VSquare): { file: number; rank: number } {
  return {
    file: square.charCodeAt(0) - 'a'.charCodeAt(0),
    rank: parseInt(square.slice(1), 10) - 1
  };
}

export function fileRankToVSquare(file: number, rank: number): VSquare | null {
  if (file < 0 || file >= V_BOARD_SIZE || rank < 0 || rank >= V_BOARD_SIZE) return null;
  return `${V_FILES[file]}${rank + 1}` as VSquare;
}

export function getReachableSquares(
  piece: Pick<VisualPiece, 'type' | 'color' | 'square'>
): VSquare[] {
  const { file, rank } = vSquareToFileRank(piece.square);
  const reachable: VSquare[] = [];

  const push = (f: number, r: number) => {
    const sq = fileRankToVSquare(f, r);
    if (sq && sq !== piece.square) reachable.push(sq);
  };

  switch (piece.type) {
    case 'p': {
      const dr = piece.color === 'w' ? 1 : -1;
      push(file - 1, rank + dr);
      push(file + 1, rank + dr);
      break;
    }
    case 'n':
      for (const [df, dr] of KNIGHT_OFFSETS) push(file + df, rank + dr);
      break;
    case 'k':
      for (const [df, dr] of KING_OFFSETS) push(file + df, rank + dr);
      break;
    case 'b':
    case 'r':
    case 'q':
      for (const [df, dr] of SLIDER_DIRECTIONS[piece.type]) {
        for (let step = 1; step <= SLIDER_MAX_RANGE; step++) {
          const sq = fileRankToVSquare(file + df * step, rank + dr * step);
          if (!sq) break;
          reachable.push(sq);
        }
      }
      break;
  }

  return reachable;
}

export function buildTempoMap(
  piece: Pick<VisualPiece, 'type' | 'color' | 'square'>,
  maxTempo: number = MAX_TEMPO
): Record<VSquare, number> {
  const tempoBySquare = {} as Record<VSquare, number>;
  for (const square of ALL_V_SQUARES) {
    tempoBySquare[square] = 0;
  }

  if (maxTempo < 1) return tempoBySquare;

  let frontier: VSquare[] = [piece.square];
  for (let d = 1; d <= maxTempo && frontier.length > 0; d++) {
    const next: VSquare[] = [];
    const seen = new Set<VSquare>();
    for (const sq of frontier) {
      for (const candidate of getReachableSquares({ ...piece, square: sq })) {
        if (candidate === piece.square) continue;
        if (tempoBySquare[candidate] === 0 && !seen.has(candidate)) {
          tempoBySquare[candidate] = d;
          seen.add(candidate);
          next.push(candidate);
        }
      }
    }
    frontier = next;
  }

  return tempoBySquare;
}

export function buildInfluenceField(
  piece: VisualPiece,
  maxTempo: number = 1
): InfluenceResult {
  const reachable = getReachableSquares(piece);
  const tempoBySquare = buildTempoMap(piece, maxTempo);
  const hue = piece.color === 'w' ? OPTICAL_CONSTANTS.whiteHue : OPTICAL_CONSTANTS.blackHue;

  const field = {} as Record<VSquare, SquareInfluence>;
  for (const square of ALL_V_SQUARES) {
    const isLit = (tempoBySquare[square] ?? 0) > 0;
    field[square] = {
      isLit,
      hue,
      saturation: isLit ? OPTICAL_CONSTANTS.softPart2Sat : 0,
      lightness: isLit ? OPTICAL_CONSTANTS.softPart2Lightness : 100
    };
  }

  return { piece, reachable, field, tempoBySquare };
}
