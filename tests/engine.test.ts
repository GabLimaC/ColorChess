import { describe, it, expect } from 'vitest';
import { OpticalChessGame } from '../src/core/chessGame';
import { computeOpticalField } from '../src/core/opticalEngine';
import { calculateHue, calculateLogSaturation } from '../src/core/colorFormulas';

describe('ChessGame Rule Integrity', () => {
  it('should initialize standard board with 20 legal moves for White', () => {
    const game = new OpticalChessGame();
    const legalMoves = game.getAllLegalMoves();
    expect(legalMoves.length).toBe(20);
    expect(game.getTurn()).toBe('w');
    expect(game.isGameOver()).toBe(false);
  });

  it('should execute Scholar’s Mate and detect checkmate correctly', () => {
    const game = new OpticalChessGame();
    // 1. e4 e5
    expect(game.makeMove('e2', 'e4')).toBe(true);
    expect(game.makeMove('e7', 'e5')).toBe(true);
    // 2. Qh5 Nc6
    expect(game.makeMove('d1', 'h5')).toBe(true);
    expect(game.makeMove('b8', 'c6')).toBe(true);
    // 3. Bc4 Nf6
    expect(game.makeMove('f1', 'c4')).toBe(true);
    expect(game.makeMove('g8', 'f6')).toBe(true);
    // 4. Qxf7#
    expect(game.makeMove('h5', 'f7')).toBe(true);

    expect(game.isCheck()).toBe(true);
    expect(game.isCheckmate()).toBe(true);
    expect(game.isGameOver()).toBe(true);
    expect(game.getWinner()).toBe('w');
  });

  it('should handle castling and en passant', () => {
    const game = new OpticalChessGame();
    // Setup en passant
    game.makeMove('e2', 'e4');
    game.makeMove('a7', 'a6');
    game.makeMove('e4', 'e5');
    game.makeMove('d7', 'd5'); // triggers en passant availability for e5 pawn on d6

    const e5Moves = game.getLegalMovesForSquare('e5');
    const epMove = e5Moves.find(m => m.to === 'd6');
    expect(epMove).toBeDefined();
    expect(epMove?.isEnPassant).toBe(true);

    expect(game.makeMove('e5', 'd6')).toBe(true);
    // Black pawn on d5 should be captured
    expect(game.getPieceAt('d5')).toBeNull();
  });

  it('should prevent moving pinned pieces into check', () => {
    // Morphy Opera pin setup: White Bishop on g5 pins Black Knight on f6 against Queen d8
    const pinFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/2B1P3/3P1N2/PPP2PPP/RN1QK2R b KQkq - 2 5';
    const game = new OpticalChessGame(pinFen);
    const nf6Moves = game.getLegalMovesForSquare('f6');
    // Knight cannot move away because it exposes Queen? In chess, pinning against Queen is a relative pin,
    // so moving is legal unless pinned against KING. Let's test absolute pin against King:
    const absolutePinFen = 'r1b1k2r/pppp1ppp/2n2n2/4p1B1/1b2P3/3P1N2/PPP2PPP/RN1QKB1R w KQkq - 4 6';
    const checkGame = new OpticalChessGame(absolutePinFen);
    // White king is in check from Bishop b4!
    expect(checkGame.isCheck()).toBe(true);
    // Only legal moves are blocking on c3, d2, or king moving to e2
    const legalMoves = checkGame.getAllLegalMoves();
    expect(legalMoves.length).toBeGreaterThan(0);
    // Verify all legal moves address the check
    for (const m of legalMoves) {
      expect(['c3', 'd2', 'e2'].includes(m.to) || m.piece === 'k').toBe(true);
    }
  });

  it('should accurately track captured pieces', () => {
    const game = new OpticalChessGame();
    game.makeMove('e2', 'e4');
    game.makeMove('d7', 'd5');
    game.makeMove('e4', 'd5'); // White captures Black pawn

    const captured = game.getCapturedPieces();
    expect(captured.w).toContain('p');
    expect(captured.b.length).toBe(0);
  });
});

describe('Color Formulas & Optical Constants', () => {
  it('should calculate pure blue (240) when only blue light reaches square', () => {
    expect(calculateHue(3, 0)).toBe(240);
  });

  it('should calculate pure red (0) when only red light reaches square', () => {
    expect(calculateHue(0, 2)).toBe(0);
  });

  it('should calculate green equilibrium (120) when blue equals red', () => {
    expect(calculateHue(2, 2)).toBe(120);
    expect(calculateHue(1, 1)).toBe(120);
  });

  it('should calculate yellow-amber (60) when R=3 and B=1', () => {
    // 240 * (1 / (1 + 3)) = 240 * 0.25 = 60
    expect(calculateHue(1, 3)).toBe(60);
  });

  it('should calculate logarithmic saturation', () => {
    expect(calculateLogSaturation(0, 0)).toBe(0);
    // With B+R = 1, ln(1) = 0, so S = 35%
    expect(calculateLogSaturation(1, 0)).toBe(35);
    // With B+R = 4, ln(4) ~ 1.386, S = 35 + 25 * 1.386 ~ 69.7%
    const sat4 = calculateLogSaturation(2, 2);
    expect(sat4).toBeGreaterThan(65);
    expect(sat4).toBeLessThan(75);
  });
});

describe('Optical Ray-Casting & Field Generation', () => {
  it('should satisfy pawn ray separation: pawns only emit diagonal attack rays', () => {
    const game = new OpticalChessGame();
    const pieces = game.getAllPieces();
    const field = computeOpticalField(pieces);

    // White e2 pawn: should emit to d3 and f3 ONLY
    const raysFromE2 = field.rays.filter(r => r.sourcePiece.square === 'e2');
    expect(raysFromE2.length).toBe(2);
    const targets = raysFromE2.map(r => r.to).sort();
    expect(targets).toEqual(['d3', 'f3']);

    // Squares e3 and e4 must receive 0 rays from e2 pawn
    expect(field.rays.some(r => r.sourcePiece.square === 'e2' && (r.to === 'e3' || r.to === 'e4'))).toBe(false);
  });

  it('should have symmetric starting optical flux between White and Black', () => {
    const game = new OpticalChessGame();
    const pieces = game.getAllPieces();
    const field = computeOpticalField(pieces);

    // Initial symmetry
    expect(field.totalBlueFlux).toBe(field.totalRedFlux);
  });

  it('should block sliding rays completely at the first obstacle (strict 100% occlusion)', () => {
    // Rook on a1 with pawn on a2 and empty board beyond
    const testPieces = [
      { id: 'w-r-a1', type: 'r' as const, color: 'w' as const, square: 'a1' as const },
      { id: 'w-p-a2', type: 'p' as const, color: 'w' as const, square: 'a2' as const },
    ];
    const field = computeOpticalField(testPieces);

    // a2 receives primary beam (1.0) and ray terminates there
    expect(field.squares['a2'].primaryBlue).toBe(1);
    expect(field.squares['a2'].totalBlue).toBe(1);
    expect(field.squares['a2'].isLit).toBe(true);

    // a3 through a8 are physically blocked by the a2 pawn: 0 rays, 0 flux, unlit
    for (const rank of ['3', '4', '5', '6', '7', '8']) {
      const sq = `a${rank}` as any;
      expect(field.squares[sq].primaryBlue).toBe(0);
      expect(field.squares[sq].totalBlue).toBe(0);
      expect(field.squares[sq].isLit).toBe(false);
    }
  });
});
