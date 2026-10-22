export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type BoardMode = 'color' | 'bw';
export type InteractionMode = 'play' | 'selection';

export type Square =
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

export interface BoardPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: Square;
}

export interface LegalMove {
  from: Square;
  to: Square;
  san: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  promotion?: PieceType;
  flags: string;
  isCapture: boolean;
  isEnPassant: boolean;
  isCastling: boolean;
  isPromotion: boolean;
}

export interface MoveRecord {
  id: string;
  moveNumber: number;
  from: Square;
  to: Square;
  san: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  promotion?: PieceType;
  fenAfter: string;
}

export interface CapturedPieces {
  w: PieceType[]; // Pieces captured by White (i.e. black pieces removed)
  b: PieceType[]; // Pieces captured by Black (i.e. white pieces removed)
}

export interface GameState {
  fen: string;
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isThreefoldRepetition: boolean;
  isInsufficientMaterial: boolean;
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
  moveHistory: MoveRecord[];
  capturedPieces: CapturedPieces;
  lastMove: { from: Square; to: Square } | null;
  halfMoves: number;
  fullMoves: number;
}

export interface Ray {
  id: string;
  sourcePiece: BoardPiece;
  direction: [number, number]; // [df, dr]
  from: Square;
  to: Square;
  path: Square[]; // Ordered squares traversed
  isXray: boolean;
  intensity: number; // 1.0 for primary, 0.15 for X-ray
}

export interface SquareOpticalState {
  square: Square;
  file: number; // 0..7 (a..h)
  rank: number; // 0..7 (1..8)
  isDarkSquare: boolean;
  primaryBlue: number;
  primaryRed: number;
  xrayBlue: number;
  xrayRed: number;
  totalBlue: number; // B = B_primary + 0.15 * B_xray
  totalRed: number;  // R = R_primary + 0.15 * R_xray
  hue: number;        // 0..240 degrees (240 = Blue, 0 = Red, 120 = Green)
  saturation: number; // 0..100%
  lightness: number;  // 0..100%
  isLit: boolean;
}

export interface OpticalField {
  squares: Record<Square, SquareOpticalState>;
  rays: Ray[];
  totalBlueFlux: number;
  totalRedFlux: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  fen: string;
}
