import { describe, it, expect } from 'vitest';
import {
  buildInfluenceWash,
  computeInfluenceField,
  computeInfluenceFieldAfterMove,
  tempoMapToWash
} from '../src/core/influenceEngine';
import { InfluenceField, Square } from '../src/core/types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function tempoOf(field: InfluenceField | null, square: Square): number {
  if (!field) return -1;
  return field.tempoBySquare[square] ?? 0;
}

describe('computeInfluenceField', () => {
  it('layers rook destinations by shortest tempo', () => {
    const field = computeInfluenceField('8/4k3/8/8/8/8/8/R3K3 w - - 0 1', 'a1', 2);

    expect(tempoOf(field, 'a8')).toBe(1);
    expect(tempoOf(field, 'd1')).toBe(1);
    expect(tempoOf(field, 'h8')).toBe(2);
    expect(tempoOf(field, 'h2')).toBe(2);
    expect(tempoOf(field, 'a1')).toBe(0);
  });

  it('layers knight destinations across three tempos', () => {
    const field = computeInfluenceField('4k3/8/8/8/8/8/8/N3K3 w - - 0 1', 'a1', 3);

    expect(tempoOf(field, 'b3')).toBe(1);
    expect(tempoOf(field, 'c2')).toBe(1);
    expect(tempoOf(field, 'd4')).toBe(2);
    expect(tempoOf(field, 'a5')).toBe(2);
    expect(tempoOf(field, 'f5')).toBe(3);
    expect(tempoOf(field, 'a1')).toBe(0);
  });

  it('filters out landings attacked by the opponent', () => {
    const field = computeInfluenceField('1r6/8/8/8/7k/8/R7/K7 w - - 0 1', 'a2', 2);

    expect(tempoOf(field, 'a8')).toBe(0);
    expect(tempoOf(field, 'b2')).toBe(0);
    expect(tempoOf(field, 'a3')).toBe(1);
    expect(tempoOf(field, 'h2')).toBe(1);
  });

  it('honors pins and allows a safe capture of the pinning piece', () => {
    const field = computeInfluenceField('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1', 'e2', 1);

    expect(tempoOf(field, 'd2')).toBe(0);
    expect(tempoOf(field, 'f2')).toBe(0);
    expect(tempoOf(field, 'e3')).toBe(0);
    expect(tempoOf(field, 'e8')).toBe(1);
  });

  it('treats promotion as a queen and keeps attacking king squares unsafe', () => {
    const field = computeInfluenceField('k7/4P3/8/8/8/8/8/4K3 w - - 0 1', 'e7', 2);

    expect(tempoOf(field, 'e8')).toBe(1);
    expect(tempoOf(field, 'd8')).toBe(2);
    expect(tempoOf(field, 'b8')).toBe(0);
  });

  it('includes castling and filters squares covered by an enemy rook', () => {
    const field = computeInfluenceField('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1', 2);

    expect(tempoOf(field, 'g1')).toBe(1);
    expect(tempoOf(field, 'c1')).toBe(1);
    expect(tempoOf(field, 'g2')).toBe(2);
    expect(tempoOf(field, 'h1')).toBe(0);
  });

  it('keeps the root en-passant capture available', () => {
    const field = computeInfluenceField('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5', 1);

    expect(tempoOf(field, 'd6')).toBe(1);
  });

  it('does not treat friendly pieces as destinations', () => {
    const field = computeInfluenceField('4k3/8/8/8/8/8/8/R1B1K3 w - - 0 1', 'a1', 1);

    expect(tempoOf(field, 'c1')).toBe(0);
    expect(tempoOf(field, 'b1')).toBe(1);
    expect(tempoOf(field, 'a8')).toBe(1);
  });

  it('continues after a capture', () => {
    const field = computeInfluenceField('4k3/8/8/8/8/8/r7/R3K3 w - - 0 1', 'a1', 2);

    expect(tempoOf(field, 'a2')).toBe(1);
    expect(tempoOf(field, 'h2')).toBe(2);
    expect(tempoOf(field, 'a8')).toBe(2);
  });

  it('returns null for depth 0 or an empty root square', () => {
    expect(computeInfluenceField(START_FEN, 'e2', 0)).toBeNull();
    expect(computeInfluenceField(START_FEN, 'e4', 1)).toBeNull();
  });
});

describe('computeInfluenceFieldAfterMove', () => {
  it('re-roots the field at the destination without mutating the source FEN', () => {
    const fen = START_FEN;
    const field = computeInfluenceFieldAfterMove(fen, 'e2', 'e4', 1);

    expect(field?.root).toBe('e4');
    expect(field?.color).toBe('w');
    expect(tempoOf(field, 'e5')).toBe(1);
    expect(tempoOf(field, 'e4')).toBe(0);
    expect(fen).toBe(START_FEN);
  });

  it('returns null when the move is illegal', () => {
    expect(computeInfluenceFieldAfterMove(START_FEN, 'e2', 'e5', 1)).toBeNull();
  });
});

describe('buildInfluenceWash', () => {
  it('maps shortest tempo to the configured alpha and omits unreachable squares', () => {
    const field: InfluenceField = {
      root: 'a1',
      color: 'w',
      maxTempo: 3,
      tempoBySquare: {
        a2: 1,
        b2: 2,
        c3: 3,
        d4: 0
      } as Record<Square, number>
    };

    const wash = buildInfluenceWash(field, { 1: 1, 2: 0.5, 3: 0.25 });

    expect(wash).toEqual({ a2: 1, b2: 0.5, c3: 0.25 });
  });

  it('returns null for a null field', () => {
    expect(buildInfluenceWash(null, { 1: 1 })).toBeNull();
  });
});

describe('tempoMapToWash', () => {
  it('maps display tempos to alphas and drops zero tempos', () => {
    const wash = tempoMapToWash(
      { a1: 1, b2: 2, c3: 3, d4: 0 } as Record<Square, number>,
      { 1: 1, 2: 0.5, 3: 0.25 }
    );

    expect(wash).toEqual({ a1: 1, b2: 0.5, c3: 0.25 });
  });
});
