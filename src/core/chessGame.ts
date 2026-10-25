import { Chess, Move, Square as ChessJsSquare, PieceSymbol } from 'chess.js';
import {
  Square,
  BoardPiece,
  LegalMove,
  MoveRecord,
  CapturedPieces,
  GameState,
  PieceColor,
  PieceType,
  PresetScenario
} from './types';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const ALL_SQUARES: Square[] = [];
for (let r = 7; r >= 0; r--) {
  for (let f = 0; f < 8; f++) {
    ALL_SQUARES.push(`${FILES[f]}${RANKS[r]}` as Square);
  }
}

export const PRESETS: PresetScenario[] = [
  {
    id: 'standard',
    name: 'Standard Starting Position',
    description: 'Initial optical balance with symmetric blue and red arrays.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  {
    id: 'central-tension',
    name: 'Central Optical Standoff',
    description: 'Pawns and minor pieces clashing over d4 and e5.',
    fen: 'r1bqkb1r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6'
  },
  {
    id: 'absolute-pin',
    name: 'Absolute Pin Motif',
    description: 'White Bishop on g5 pinning Black Knight on f6 against Queen d8.',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/2B1P3/3P1N2/PPP2PPP/RN1QK2R b KQkq - 2 5'
  },
  {
    id: 'scholars-mate',
    name: "Scholar's Mate Threat",
    description: 'Queen and Bishop coordinating against the critical f7 focal point.',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 5'
  },
  {
    id: 'discovered-attack',
    name: 'Discovered Attack Shutter',
    description: 'Retracting a blocking piece unmasks a latent long-range laser.',
    fen: 'r1b1k2r/ppppqppp/2n5/1B2b3/4N3/8/PPPP1PPP/R1BQR1K1 w kq - 4 9'
  },
  {
    id: 'endgame-clash',
    name: 'Endgame Laser Duel',
    description: 'Rook and passed pawns testing endgame dynamic range.',
    fen: '8/5pk1/4p1p1/7p/3R3P/6P1/5PK1/2r5 w - - 0 40'
  }
];

export class OpticalChessGame {
  private chess: Chess;
  private moveRecords: MoveRecord[] = [];
  private startFen: string | null = null;
  private plyIndex = -1;
  private isReplay = false;
  private pgnHeaders: Record<string, string> = {};

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.rebuildHistoryFromEngine();
  }

  private rebuildHistoryFromEngine() {
    this.moveRecords = [];
    const history = this.chess.history({ verbose: true });
    history.forEach((m, idx) => {
      this.moveRecords.push({
        id: `move-${idx + 1}`,
        moveNumber: Math.floor(idx / 2) + 1,
        from: m.from as Square,
        to: m.to as Square,
        san: m.san,
        piece: m.piece as PieceType,
        color: m.color as PieceColor,
        captured: m.captured ? (m.captured as PieceType) : undefined,
        promotion: m.promotion ? (m.promotion as PieceType) : undefined,
        fenAfter: m.after
      });
    });
    this.plyIndex = this.moveRecords.length - 1;
  }

  private clearReplayState() {
    this.startFen = null;
    this.plyIndex = -1;
    this.isReplay = false;
    this.pgnHeaders = {};
  }

  private static toMoveRecord(m: Move, idx: number): MoveRecord {
    return {
      id: `move-${idx + 1}`,
      moveNumber: Math.floor(idx / 2) + 1,
      from: m.from as Square,
      to: m.to as Square,
      san: m.san,
      piece: m.piece as PieceType,
      color: m.color as PieceColor,
      captured: m.captured ? (m.captured as PieceType) : undefined,
      promotion: m.promotion ? (m.promotion as PieceType) : undefined,
      fenAfter: m.after
    };
  }

  public getFen(): string {
    return this.chess.fen();
  }

  public getTurn(): PieceColor {
    return this.chess.turn() as PieceColor;
  }

  public isCheck(): boolean {
    return this.chess.isCheck();
  }

  public isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  public isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  public isDraw(): boolean {
    return this.chess.isDraw();
  }

  public isThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  public isInsufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  public isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  public getWinner(): PieceColor | 'draw' | null {
    if (!this.chess.isGameOver()) return null;
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? 'b' : 'w';
    }
    return 'draw';
  }

  public getPieceAt(square: Square): BoardPiece | null {
    const p = this.chess.get(square as ChessJsSquare);
    if (!p) return null;
    return {
      id: `${p.color}-${p.type}-${square}`,
      type: p.type as PieceType,
      color: p.color as PieceColor,
      square
    };
  }

  public getAllPieces(): BoardPiece[] {
    const pieces: BoardPiece[] = [];
    for (const sq of ALL_SQUARES) {
      const p = this.getPieceAt(sq);
      if (p) pieces.push(p);
    }
    return pieces;
  }

  public getLegalMovesForSquare(square: Square): LegalMove[] {
    const moves = this.chess.moves({ square: square as ChessJsSquare, verbose: true });
    return moves.map(m => ({
      from: m.from as Square,
      to: m.to as Square,
      san: m.san,
      piece: m.piece as PieceType,
      color: m.color as PieceColor,
      captured: m.captured ? (m.captured as PieceType) : undefined,
      promotion: m.promotion ? (m.promotion as PieceType) : undefined,
      flags: m.flags,
      isCapture: m.captured !== undefined,
      isEnPassant: m.flags.includes('e'),
      isCastling: m.flags.includes('k') || m.flags.includes('q'),
      isPromotion: m.promotion !== undefined
    }));
  }

  public getAllLegalMoves(): LegalMove[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.map(m => ({
      from: m.from as Square,
      to: m.to as Square,
      san: m.san,
      piece: m.piece as PieceType,
      color: m.color as PieceColor,
      captured: m.captured ? (m.captured as PieceType) : undefined,
      promotion: m.promotion ? (m.promotion as PieceType) : undefined,
      flags: m.flags,
      isCapture: m.captured !== undefined,
      isEnPassant: m.flags.includes('e'),
      isCastling: m.flags.includes('k') || m.flags.includes('q'),
      isPromotion: m.promotion !== undefined
    }));
  }

  public requiresPromotion(from: Square, to: Square): boolean {
    const piece = this.getPieceAt(from);
    if (!piece || piece.type !== 'p') return false;
    const toRank = to[1];
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
  }

  public makeMove(from: Square, to: Square, promotion: PieceType = 'q'): boolean {
    try {
      const moveResult = this.chess.move({
        from: from as ChessJsSquare,
        to: to as ChessJsSquare,
        promotion: promotion as PieceSymbol
      });

      if (!moveResult) return false;

      if (this.isReplay && this.plyIndex < this.moveRecords.length - 1) {
        this.moveRecords = this.moveRecords.slice(0, this.plyIndex + 1);
      }

      const moveIdx = this.moveRecords.length;
      this.moveRecords.push({
        id: `move-${moveIdx + 1}`,
        moveNumber: Math.floor(moveIdx / 2) + 1,
        from: moveResult.from as Square,
        to: moveResult.to as Square,
        san: moveResult.san,
        piece: moveResult.piece as PieceType,
        color: moveResult.color as PieceColor,
        captured: moveResult.captured ? (moveResult.captured as PieceType) : undefined,
        promotion: moveResult.promotion ? (moveResult.promotion as PieceType) : undefined,
        fenAfter: moveResult.after
      });

      this.plyIndex = this.moveRecords.length - 1;
      return true;
    } catch {
      return false;
    }
  }

  public undo(): boolean {
    // In replay the full game is already recorded: undo steps back one ply and keeps the
    // continuation navigable. Only a fresh move truncates the remaining moves.
    if (this.isReplay) {
      if (this.plyIndex < 0) return false;
      return this.seekToPly(this.plyIndex - 1);
    }

    if (this.moveRecords.length === 0) return false;
    this.moveRecords.pop();
    const last = this.moveRecords[this.moveRecords.length - 1];
    if (last) this.chess.load(last.fenAfter);
    else if (this.startFen) this.chess.load(this.startFen);
    else this.chess.reset();
    this.plyIndex = this.moveRecords.length - 1;
    return true;
  }

  public reset(fen?: string): void {
    if (fen) {
      this.chess.load(fen);
    } else {
      this.chess.reset();
    }
    this.clearReplayState();
    this.rebuildHistoryFromEngine();
  }

  public loadFen(fen: string): boolean {
    try {
      this.chess.load(fen);
    } catch {
      return false;
    }
    this.clearReplayState();
    this.rebuildHistoryFromEngine();
    return true;
  }

  /**
   * Imports a PGN game for replay. Parsing happens on a throwaway engine instance so a
   * malformed PGN can never corrupt the live board.
   */
  public loadPgn(pgn: string): boolean {
    if (!pgn.trim()) return false;

    let headers: Record<string, string>;
    let verbose: Move[];
    let startFen: string;
    try {
      const parser = new Chess();
      parser.loadPgn(pgn);
      headers = parser.getHeaders();
      verbose = parser.history({ verbose: true });
      while (parser.undo()) {
        // rewind to the position before move 1
      }
      startFen = parser.fen();
    } catch {
      return false;
    }

    this.moveRecords = verbose.map((m, idx) => OpticalChessGame.toMoveRecord(m, idx));
    this.startFen = startFen;
    this.pgnHeaders = headers;
    this.isReplay = true;
    this.plyIndex = -1;
    // The engine's own move history is wiped by load(), so replay seeks are snapshot-based.
    this.chess.load(startFen);
    return true;
  }

  public seekToPly(ply: number): boolean {
    if (!Number.isInteger(ply) || ply < -1 || ply >= this.moveRecords.length) return false;
    const fen = ply === -1 ? (this.startFen ?? this.chess.fen()) : this.moveRecords[ply].fenAfter;
    try {
      this.chess.load(fen);
    } catch {
      return false;
    }
    this.plyIndex = ply;
    return true;
  }

  /**
   * Simulates a candidate move on a cloned engine instance and returns the resulting BoardPiece array,
   * without mutating active game state.
   */
  public getSimulatedPiecesAfterMove(from: Square, to: Square, promotion: PieceType = 'q'): BoardPiece[] | null {
    try {
      const clone = new Chess(this.chess.fen());
      const res = clone.move({
        from: from as ChessJsSquare,
        to: to as ChessJsSquare,
        promotion: promotion as PieceSymbol
      });
      if (!res) return null;

      const pieces: BoardPiece[] = [];
      const board = clone.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece) {
            const sq = `${FILES[f]}${RANKS[7 - r]}` as Square;
            pieces.push({
              id: `${piece.color}-${piece.type}-${sq}`,
              type: piece.type as PieceType,
              color: piece.color as PieceColor,
              square: sq
            });
          }
        }
      }
      return pieces;
    } catch {
      return null;
    }
  }

  public getCapturedPieces(): CapturedPieces {
    // Initial standard piece budget per color
    const initialCounts: Record<PieceType, number> = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1
    };

    const currentWhite: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    const currentBlack: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    for (const sq of ALL_SQUARES) {
      const p = this.getPieceAt(sq);
      if (p) {
        if (p.color === 'w') {
          currentWhite[p.type]++;
        } else {
          currentBlack[p.type]++;
        }
      }
    }

    const capturedByWhite: PieceType[] = []; // Black pieces captured
    const capturedByBlack: PieceType[] = []; // White pieces captured

    // Compute difference for standard pieces (p, n, b, r, q)
    const pieceTypes: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
    for (const t of pieceTypes) {
      const missingBlack = Math.max(0, initialCounts[t] - currentBlack[t]);
      for (let i = 0; i < missingBlack; i++) {
        capturedByWhite.push(t);
      }
      const missingWhite = Math.max(0, initialCounts[t] - currentWhite[t]);
      for (let i = 0; i < missingWhite; i++) {
        capturedByBlack.push(t);
      }
    }

    return {
      w: capturedByWhite,
      b: capturedByBlack
    };
  }

  public getGameState(): GameState {
    const lastRecord = this.moveRecords[this.moveRecords.length - 1];
    const activeRecord = this.isReplay ? this.moveRecords[this.plyIndex] : lastRecord;
    return {
      fen: this.getFen(),
      turn: this.getTurn(),
      isCheck: this.isCheck(),
      isCheckmate: this.isCheckmate(),
      isStalemate: this.isStalemate(),
      isDraw: this.isDraw(),
      isThreefoldRepetition: this.isThreefoldRepetition(),
      isInsufficientMaterial: this.isInsufficientMaterial(),
      isGameOver: this.isGameOver(),
      winner: this.getWinner(),
      moveHistory: [...this.moveRecords],
      capturedPieces: this.getCapturedPieces(),
      lastMove: activeRecord ? { from: activeRecord.from, to: activeRecord.to } : null,
      halfMoves: 0,
      fullMoves: Math.floor(this.moveRecords.length / 2) + 1,
      currentPly: this.plyIndex,
      isReplay: this.isReplay,
      pgnHeaders: { ...this.pgnHeaders }
    };
  }
}

export function squareToFileRank(square: Square): { file: number; rank: number } {
  const f = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const r = parseInt(square[1], 10) - 1;
  return { file: f, rank: r };
}

export function fileRankToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

export function isDarkSquare(file: number, rank: number): boolean {
  return (file + rank) % 2 === 0;
}
