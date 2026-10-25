import { describe, it, expect } from 'vitest';
import {
  ALL_V_SQUARES,
  MAX_TEMPO,
  SLIDER_MAX_RANGE,
  buildInfluenceField,
  buildTempoMap,
  fileRankToVSquare,
  getReachableSquares,
  vSquareToFileRank
} from '../src/visualizer/movementEngine';
import { OPTICAL_CONSTANTS } from '../src/core/colorFormulas';
import { VisualPiece } from '../src/visualizer/types';

const piece = (
  type: VisualPiece['type'],
  color: VisualPiece['color'],
  square: VisualPiece['square']
): VisualPiece => ({ id: 'test', type, color, square });

describe('16x16 square helpers', () => {
  it('enumerates all 256 squares', () => {
    expect(ALL_V_SQUARES).toHaveLength(256);
    expect(new Set(ALL_V_SQUARES).size).toBe(256);
    expect(ALL_V_SQUARES[0]).toBe('a1');
    expect(ALL_V_SQUARES[ALL_V_SQUARES.length - 1]).toBe('p16');
  });

  it('round-trips file/rank coordinates', () => {
    expect(vSquareToFileRank('a1')).toEqual({ file: 0, rank: 0 });
    expect(vSquareToFileRank('i8')).toEqual({ file: 8, rank: 7 });
    expect(vSquareToFileRank('p16')).toEqual({ file: 15, rank: 15 });
    expect(fileRankToVSquare(8, 7)).toBe('i8');
  });

  it('rejects off-board coordinates', () => {
    expect(fileRankToVSquare(-1, 0)).toBeNull();
    expect(fileRankToVSquare(16, 0)).toBeNull();
    expect(fileRankToVSquare(0, -1)).toBeNull();
    expect(fileRankToVSquare(0, 16)).toBeNull();
  });
});

describe('Movement engine reachable squares', () => {
  it('rook on i8 reaches 30 squares (8 left, 7 right, 7 down, 8 up)', () => {
    const reachable = getReachableSquares(piece('r', 'w', 'i8'));
    expect(reachable).toHaveLength(30);
    expect(reachable).toContain('a8');
    expect(reachable).toContain('p8');
    expect(reachable).toContain('i1');
    expect(reachable).toContain('i16');
    expect(reachable).not.toContain('i8');
  });

  it('bishop on i8 reaches 29 squares', () => {
    const reachable = getReachableSquares(piece('b', 'w', 'i8'));
    expect(reachable).toHaveLength(29);
    expect(reachable).toContain('a16');
    expect(reachable).toContain('p1');
    expect(reachable).toContain('b1');
    expect(reachable).toContain('p15');
    expect(reachable).not.toContain('a1');
  });

  it('queen on i8 reaches 59 squares (rook + bishop)', () => {
    const reachable = getReachableSquares(piece('q', 'w', 'i8'));
    expect(reachable).toHaveLength(59);
    expect(new Set(reachable).size).toBe(59);
  });

  it('king on i8 reaches 8 adjacent squares', () => {
    const reachable = getReachableSquares(piece('k', 'w', 'i8'));
    expect(reachable).toHaveLength(8);
    expect(reachable).toContain('h7');
    expect(reachable).toContain('j9');
    expect(reachable).not.toContain('i8');
  });

  it('knight on i8 reaches 8 L-squares', () => {
    const reachable = getReachableSquares(piece('n', 'w', 'i8'));
    expect(reachable).toHaveLength(8);
    expect(reachable).toContain('j10');
    expect(reachable).toContain('k9');
    expect(reachable).toContain('g7');
    expect(reachable).toContain('h6');
  });

  it('caps slider range at 8 steps from the edge', () => {
    expect(SLIDER_MAX_RANGE).toBe(8);
    const reachable = getReachableSquares(piece('r', 'w', 'a1'));
    expect(reachable).toHaveLength(16);
    expect(reachable).toContain('i1');
    expect(reachable).not.toContain('j1');
    expect(reachable).not.toContain('k1');
    expect(reachable).toContain('a9');
    expect(reachable).not.toContain('a10');
  });

  it('colors only the forward diagonal squares for pawns', () => {
    expect(new Set(getReachableSquares(piece('p', 'w', 'i8')))).toEqual(new Set(['h9', 'j9']));
    expect(new Set(getReachableSquares(piece('p', 'b', 'i8')))).toEqual(new Set(['h7', 'j7']));
  });

  it('returns an empty list for a pawn on its promotion edge', () => {
    expect(getReachableSquares(piece('p', 'w', 'i16'))).toEqual([]);
    expect(getReachableSquares(piece('p', 'b', 'i1'))).toEqual([]);
  });

  it('drops pawn targets that fall off the board', () => {
    expect(getReachableSquares(piece('p', 'w', 'a8'))).toEqual(['b9']);
    expect(getReachableSquares(piece('p', 'b', 'p8'))).toEqual(['o7']);
  });
});

describe('Influence field', () => {
  it('lights exactly the reachable squares with the white hue', () => {
    const result = buildInfluenceField(piece('q', 'w', 'i8'));
    const litSquares = ALL_V_SQUARES.filter(sq => result.field[sq].isLit);

    expect(litSquares).toHaveLength(result.reachable.length);
    expect(litSquares.sort()).toEqual([...result.reachable].sort());

    for (const sq of result.reachable) {
      expect(result.field[sq]).toEqual({
        isLit: true,
        hue: OPTICAL_CONSTANTS.whiteHue,
        saturation: OPTICAL_CONSTANTS.softPart2Sat,
        lightness: OPTICAL_CONSTANTS.softPart2Lightness
      });
    }

    expect(result.field['i8'].isLit).toBe(false);
    expect(result.field['a1'].isLit).toBe(false);
  });

  it('uses the red hue for black pieces', () => {
    const result = buildInfluenceField(piece('r', 'b', 'i8'));
    for (const sq of result.reachable) {
      expect(result.field[sq].hue).toBe(OPTICAL_CONSTANTS.blackHue);
      expect(result.field[sq].isLit).toBe(true);
    }
    expect(result.field['i8'].isLit).toBe(false);
  });

  it('rebuilds the field after a move', () => {
    const moved = buildInfluenceField(piece('r', 'w', 'a1'));
    expect(moved.field['i1'].isLit).toBe(true);
    expect(moved.field['j1'].isLit).toBe(false);
    expect(moved.field['i8'].isLit).toBe(false);
  });

  it('produces an empty field for an off-board pawn', () => {
    const result = buildInfluenceField(piece('p', 'w', 'i16'));
    expect(result.reachable).toEqual([]);
    expect(ALL_V_SQUARES.every(sq => !result.field[sq].isLit)).toBe(true);
  });
});

describe('Tempo expansion', () => {
  it('exports MAX_TEMPO as 3', () => {
    expect(MAX_TEMPO).toBe(3);
  });

  it('tempo-1 map equals getReachableSquares', () => {
    const rook = piece('r', 'w', 'i8');
    const tempoMap = buildTempoMap(rook, 1);
    const oneTempoSquares = ALL_V_SQUARES.filter(sq => tempoMap[sq] === 1);
    expect(oneTempoSquares.sort()).toEqual([...getReachableSquares(rook)].sort());
  });

  it('assigns rook-on-a1 shortest distances across three tempos', () => {
    const rook = piece('r', 'w', 'a1');
    const tempoMap = buildTempoMap(rook, 3);

    expect(tempoMap['a1']).toBe(0);
    expect(tempoMap['i1']).toBe(1);
    expect(tempoMap['a9']).toBe(1);
    expect(tempoMap['j1']).toBe(2);
    expect(tempoMap['b2']).toBe(2);
    expect(tempoMap['a16']).toBe(2);
    expect(tempoMap['i16']).toBe(3);
    expect(tempoMap['p16']).toBe(0);
  });

  it('king on i8 reaches the 5x5 Chebyshev neighbourhood minus origin in tempo 2', () => {
    const king = piece('k', 'w', 'i8');
    const tempoMap = buildTempoMap(king, 2);

    const withinTempo2 = ALL_V_SQUARES.filter(sq => tempoMap[sq] > 0);
    expect(withinTempo2).toHaveLength(24);

    for (const sq of getReachableSquares(king)) {
      expect(tempoMap[sq]).toBe(1);
    }
    expect(tempoMap['i8']).toBe(0);
  });

  it('white pawn on i8 steps twice diagonally', () => {
    const pawn = piece('p', 'w', 'i8');
    const tempoMap = buildTempoMap(pawn, 2);

    expect(tempoMap['h9']).toBe(1);
    expect(tempoMap['j9']).toBe(1);
    expect(new Set(ALL_V_SQUARES.filter(sq => tempoMap[sq] === 2))).toEqual(
      new Set(['g10', 'i10', 'k10'])
    );
  });

  it('buildInfluenceField at tempo 3 lights exactly the non-zero tempo squares', () => {
    const queen = piece('q', 'w', 'i8');
    const result = buildInfluenceField(queen, 3);

    expect(result.reachable).toEqual(getReachableSquares(queen));
    const litSquares = ALL_V_SQUARES.filter(sq => result.field[sq].isLit);
    expect(litSquares).toHaveLength(ALL_V_SQUARES.filter(sq => result.tempoBySquare[sq] > 0).length);
    for (const sq of litSquares) {
      expect(result.tempoBySquare[sq]).toBeGreaterThan(0);
    }
    for (const sq of ALL_V_SQUARES) {
      if (result.tempoBySquare[sq] > 0) {
        expect(result.field[sq].isLit).toBe(true);
      }
    }
  });

  it('default buildInfluenceField matches explicit tempo 1', () => {
    const rook = piece('r', 'w', 'i8');
    expect(buildInfluenceField(rook)).toEqual(buildInfluenceField(rook, 1));
  });
});
