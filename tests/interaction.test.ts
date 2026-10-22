import { describe, it, expect } from 'vitest';
import { squareToColRow, colRowToSquare } from '../src/components/PieceOverlay';
import { OpticalChessGame, PRESETS } from '../src/core/chessGame';
import { Square } from '../src/core/types';

describe('Coordinate Transformation & Board Flipping', () => {
  it('should correctly convert square to col/row in normal perspective (White)', () => {
    // a8 should be top-left (col 0, row 0)
    expect(squareToColRow('a8', false)).toEqual({ col: 0, row: 0 });
    // h1 should be bottom-right (col 7, row 7)
    expect(squareToColRow('h1', false)).toEqual({ col: 7, row: 7 });
    // e4 should be col 4, row 4
    expect(squareToColRow('e4', false)).toEqual({ col: 4, row: 4 });
  });

  it('should correctly convert square to col/row in flipped perspective (Black)', () => {
    // a8 should be bottom-right (col 7, row 7)
    expect(squareToColRow('a8', true)).toEqual({ col: 7, row: 7 });
    // h1 should be top-left (col 0, row 0)
    expect(squareToColRow('h1', true)).toEqual({ col: 0, row: 0 });
    // e4 in flipped: file 'e' (4) -> col = 7 - 4 = 3; rank '4' (3) -> row = 3
    expect(squareToColRow('e4', true)).toEqual({ col: 3, row: 3 });
  });

  it('should be bijective: converting square -> col/row -> square is identity', () => {
    const testSquares: Square[] = ['a1', 'a8', 'h1', 'h8', 'e4', 'd5', 'c3', 'f6'];
    for (const sq of testSquares) {
      // Normal
      const normalCoord = squareToColRow(sq, false);
      expect(colRowToSquare(normalCoord.col, normalCoord.row, false)).toBe(sq);

      // Flipped
      const flippedCoord = squareToColRow(sq, true);
      expect(colRowToSquare(flippedCoord.col, flippedCoord.row, true)).toBe(sq);
    }
  });
});

describe('Preset Scenarios & Game State Machine', () => {
  it('should load all preset scenarios without error and contain valid pieces', () => {
    const game = new OpticalChessGame();
    for (const preset of PRESETS) {
      const success = game.loadFen(preset.fen);
      expect(success).toBe(true);
      const pieces = game.getAllPieces();
      expect(pieces.length).toBeGreaterThan(0);
      expect(game.getFen()).toContain(preset.fen.split(' ')[0]);
    }
  });

  it('should handle undo and reset operations cleanly', () => {
    const game = new OpticalChessGame();
    expect(game.makeMove('e2', 'e4')).toBe(true);
    expect(game.getPieceAt('e4')).not.toBeNull();
    expect(game.getPieceAt('e2')).toBeNull();

    expect(game.undo()).toBe(true);
    expect(game.getPieceAt('e2')).not.toBeNull();
    expect(game.getPieceAt('e4')).toBeNull();

    // Reset test
    game.makeMove('d2', 'd4');
    game.reset();
    expect(game.getPieceAt('d2')).not.toBeNull();
    expect(game.getGameState().moveHistory.length).toBe(0);
  });

  it('should detect pawn promotion requirement', () => {
    // Position where White pawn is on e7 and can promote to e8
    const promoFen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
    const game = new OpticalChessGame(promoFen);
    expect(game.requiresPromotion('e7', 'e8')).toBe(true);

    // Promote to Queen
    expect(game.makeMove('e7', 'e8', 'q')).toBe(true);
    const piece = game.getPieceAt('e8');
    expect(piece?.type).toBe('q');
    expect(piece?.color).toBe('w');
  });
});
