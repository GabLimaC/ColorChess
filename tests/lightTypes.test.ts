import { describe, it, expect } from 'vitest';
import {
  BAND_WIDTH,
  CORE_WIDTH,
  DISC_RADIUS,
  KING_FRAME_REACH,
  KNIGHT_RING_WIDTH,
  SHAPE_ALPHA,
  buildRayIndex,
  frameRect,
  screenDirection,
  specsForPiece,
} from '../src/render/lightTypes';
import { computeOpticalField } from '../src/core/opticalEngine';
import { BoardPiece } from '../src/core/types';

describe('screenDirection: board space to screen space', () => {
  const expectDirection = (
    actual: { dx: number; dy: number },
    dx: number,
    dy: number
  ): void => {
    expect(actual.dx).toBeCloseTo(dx, 9);
    expect(actual.dy).toBeCloseTo(dy, 9);
  };

  it('maps +file to screen right when unflipped and screen left when flipped', () => {
    expectDirection(screenDirection([1, 0], false), 1, 0);
    expectDirection(screenDirection([1, 0], true), -1, 0);
  });

  it('maps +rank to screen up when unflipped and screen down when flipped', () => {
    expectDirection(screenDirection([0, 1], false), 0, -1);
    expectDirection(screenDirection([0, 1], true), 0, 1);
  });

  it('mirrors both axes for diagonal rays when flipped', () => {
    expectDirection(screenDirection([1, 1], false), 1, -1);
    expectDirection(screenDirection([1, 1], true), -1, 1);
    expectDirection(screenDirection([-1, 1], false), -1, -1);
    expectDirection(screenDirection([-1, 1], true), 1, 1);
  });
});

describe('specsForPiece: shape vocabulary', () => {
  it('gives a pawn a single full-square fill', () => {
    const specs = specsForPiece('p', { dx: 1, dy: -1 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('fill');
    expect(spec.alpha).toBe(SHAPE_ALPHA);
  });

  it('gives a rook one axis-aligned band along a vertical ray', () => {
    const specs = specsForPiece('r', { dx: 0, dy: -1 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('band');
    if (spec.kind !== 'band') throw new Error('expected band');
    expect(spec.width).toBe(BAND_WIDTH);
    expect(Math.abs(Math.sin(spec.angle))).toBeCloseTo(1, 6);
    expect(Math.abs(Math.cos(spec.angle))).toBeCloseTo(0, 6);
    expect(spec.coreWidth).toBeUndefined();
  });

  it('gives a bishop one 45 degree band along a diagonal ray', () => {
    const specs = specsForPiece('b', { dx: 1, dy: -1 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('band');
    if (spec.kind !== 'band') throw new Error('expected band');
    expect(spec.width).toBe(BAND_WIDTH);
    expect(Math.abs(spec.angle)).toBeCloseTo(Math.PI / 4, 6);
  });

  it('gives a queen a band carrying a bright core filament', () => {
    const specs = specsForPiece('q', { dx: 1, dy: 0 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('band');
    if (spec.kind !== 'band') throw new Error('expected band');
    expect(spec.width).toBe(BAND_WIDTH);
    expect(spec.coreWidth).toBe(CORE_WIDTH);
    expect(CORE_WIDTH).toBeLessThan(BAND_WIDTH);
  });

  it('gives a knight one jump-ring arch spec', () => {
    const specs = specsForPiece('n', { dx: 2, dy: 1 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('ring');
    if (spec.kind !== 'ring') throw new Error('expected ring');
    expect(spec.width).toBe(KNIGHT_RING_WIDTH);
    expect(spec.dx).toBe(2);
    expect(spec.dy).toBe(1);
    expect(spec.alpha).toBe(SHAPE_ALPHA);
  });

  it('gives a king one thick square frame spec', () => {
    const specs = specsForPiece('k', { dx: 1, dy: 0 });
    expect(specs).toHaveLength(1);
    const spec = specs[0];
    expect(spec.kind).toBe('frame');
    if (spec.kind !== 'frame') throw new Error('expected frame');
    expect(spec.reach).toBe(KING_FRAME_REACH);
    expect(spec.dx).toBe(1);
    expect(spec.dy).toBe(0);
    expect(spec.alpha).toBe(SHAPE_ALPHA);
  });

  it('signs the king frame direction for diagonal rays', () => {
    const specs = specsForPiece('k', { dx: -1, dy: -1 });
    const spec = specs[0];
    if (spec.kind !== 'frame') throw new Error('expected frame');
    expect(spec.dx).toBe(-1);
    expect(spec.dy).toBe(-1);
  });
});

describe('buildRayIndex: per-square ray membership', () => {
  it('returns an empty index for no rays', () => {
    expect(buildRayIndex([]).size).toBe(0);
  });

  it('indexes every square on every path', () => {
    const pieces: BoardPiece[] = [
      { id: 'w-r-a1', type: 'r', color: 'w', square: 'a1' },
      { id: 'w-p-a2', type: 'p', color: 'w', square: 'a2' },
    ];
    const field = computeOpticalField(pieces);
    const index = buildRayIndex(field.rays);

    for (const ray of field.rays) {
      for (const square of ray.path) {
        expect(index.get(square)).toContain(ray);
      }
    }

    expect(index.get('a2')).toHaveLength(1);
    expect(index.get('a3')).toBeUndefined();
  });

  it('keeps multiple contributions per square in ray order', () => {
    const pieces: BoardPiece[] = [
      { id: 'w-r-a1', type: 'r', color: 'w', square: 'a1' },
      { id: 'b-r-a8', type: 'r', color: 'b', square: 'a8' },
    ];
    const field = computeOpticalField(pieces);
    const index = buildRayIndex(field.rays);

    const contested = index.get('a4');
    expect(contested).toBeDefined();
    expect(contested).toHaveLength(2);
    expect(contested?.map(ray => ray.sourcePiece.color).sort()).toEqual(['b', 'w']);

    const expectedOrder = field.rays.filter(ray => ray.path.includes('a4'));
    expect(contested).toEqual(expectedOrder);
  });
});

describe('light type constants', () => {
  it('keeps every normalized dimension within (0, 1] of the square size', () => {
    const values = [BAND_WIDTH, CORE_WIDTH, DISC_RADIUS, KING_FRAME_REACH, KNIGHT_RING_WIDTH, SHAPE_ALPHA];
    for (const value of values) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('keeps centered shapes inside their square clip', () => {
    expect(DISC_RADIUS).toBeLessThan(0.5);
  });
});

describe('frameRect: king square frame geometry', () => {
  it('fills to the touching edge and stops before the far edge on an orthogonal ray', () => {
    const right = frameRect(1, 0, KING_FRAME_REACH);
    expect(right.x).toBeCloseTo(0, 9);
    expect(right.w).toBeCloseTo(KING_FRAME_REACH, 9);
    expect(right.y).toBeCloseTo(0, 9);
    expect(right.h).toBeCloseTo(1, 9);

    const left = frameRect(-1, 0, KING_FRAME_REACH);
    expect(left.x).toBeCloseTo(1 - KING_FRAME_REACH, 9);
    expect(left.x + left.w).toBeCloseTo(1, 9);
  });

  it('anchors a square corner block on diagonal rays', () => {
    const rect = frameRect(1, 1, KING_FRAME_REACH);
    expect(rect.x).toBeCloseTo(0, 9);
    expect(rect.y).toBeCloseTo(0, 9);
    expect(rect.w).toBeCloseTo(KING_FRAME_REACH, 9);
    expect(rect.h).toBeCloseTo(KING_FRAME_REACH, 9);

    const upLeft = frameRect(-1, -1, KING_FRAME_REACH);
    expect(upLeft.x).toBeCloseTo(1 - KING_FRAME_REACH, 9);
    expect(upLeft.y).toBeCloseTo(1 - KING_FRAME_REACH, 9);
  });

  it('stops before the opposite edge for every king direction', () => {
    const directions: Array<[number, number]> = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    for (const [dx, dy] of directions) {
      const rect = frameRect(dx, dy, KING_FRAME_REACH);
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
      expect(rect.x + rect.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(rect.y + rect.h).toBeLessThanOrEqual(1 + 1e-9);
      if (dx !== 0) expect(rect.w).toBeLessThan(1);
      if (dy !== 0) expect(rect.h).toBeLessThan(1);
    }
  });
});
