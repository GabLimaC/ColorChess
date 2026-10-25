import { PieceColor, PieceType } from '../core/types';

export type VFile =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
  | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p';

export type VRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type VSquare = `${VFile}${VRank}`;

export interface VisualPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: VSquare;
}

export type TempoDistance = 1 | 2 | 3;

export interface SquareInfluence {
  isLit: boolean;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface InfluenceResult {
  piece: VisualPiece;
  reachable: VSquare[];                    // tempo-1 only (unchanged)
  field: Record<VSquare, SquareInfluence>; // isLit for tempo 1..maxTempo
  tempoBySquare: Record<VSquare, number>;  // 0 = unreachable, 1..3 = shortest tempo
}
