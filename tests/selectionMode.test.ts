import { describe, it, expect } from 'vitest';
import { computeHighlightEdges } from '../src/render/boardRenderer';
import { computeOpticalField } from '../src/core/opticalEngine';
import { OpticalChessGame } from '../src/core/chessGame';
import { BoardPiece, Square } from '../src/core/types';

const squareSize = 100;
const inset = 1.25;

describe('Highlight Edges: No Internal Subdivisions for Squares in Same Area', () => {

  it('should render an isolated single square with exactly 4 exterior edges', () => {
    // d4 is at file 3, rank 3 (display: f = 3, r = 4 when flipped = false)
    const affected = new Set<Square>(['d4']);
    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    expect(edges.length).toBe(4);
    const types = edges.map(e => e.type).sort();
    expect(types).toEqual(['bottom', 'left', 'right', 'top']);
  });

  it('should omit internal subdivision between two horizontally adjacent squares', () => {
    // d4 (f=3, rank=3) and e4 (f=4, rank=3)
    const affected = new Set<Square>(['d4', 'e4']);
    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // Should have:
    // 2 top edges (one per cell, meeting seamlessly at x = 400)
    // 2 bottom edges (one per cell, meeting seamlessly at x = 400)
    // 1 left edge (for d4 at x = 300 + inset)
    // 1 right edge (for e4 at x = 500 - inset)
    // ZERO right edge for d4 and ZERO left edge for e4 (internal vertical subdivision omitted!)
    expect(edges.length).toBe(6);

    const rightEdges = edges.filter(e => e.type === 'right');
    const leftEdges = edges.filter(e => e.type === 'left');

    expect(rightEdges.length).toBe(1);
    expect(rightEdges[0].f).toBe(4); // Only the right edge of e4

    expect(leftEdges.length).toBe(1);
    expect(leftEdges[0].f).toBe(3); // Only the left edge of d4

    // Verify seamless horizontal continuity across x = 400
    const topEdges = edges.filter(e => e.type === 'top');
    const d4Top = topEdges.find(e => e.f === 3)!;
    const e4Top = topEdges.find(e => e.f === 4)!;
    expect(d4Top.xEnd).toBe(4 * squareSize);
    expect(e4Top.xStart).toBe(4 * squareSize);
  });

  it('should omit internal subdivision between two vertically adjacent squares', () => {
    // d4 (f=3, rank 3 -> r=4) and d5 (f=3, rank 4 -> r=3)
    const affected = new Set<Square>(['d4', 'd5']);
    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // Should have:
    // 1 top edge (for d5 at r=3)
    // 1 bottom edge (for d4 at r=4)
    // 2 left edges (meeting seamlessly at y = 400)
    // 2 right edges (meeting seamlessly at y = 400)
    // ZERO bottom edge for d5 and ZERO top edge for d4 (internal horizontal subdivision omitted!)
    expect(edges.length).toBe(6);

    const topEdges = edges.filter(e => e.type === 'top');
    const bottomEdges = edges.filter(e => e.type === 'bottom');

    expect(topEdges.length).toBe(1);
    expect(topEdges[0].r).toBe(3); // top of d5

    expect(bottomEdges.length).toBe(1);
    expect(bottomEdges[0].r).toBe(4); // bottom of d4
  });

  it('for Rooks: should have zero internal subdivisions along the entire ray', () => {
    // White Rook on d1 influencing d2, d3, d4, d5, d6, d7, d8
    const rookPieces: BoardPiece[] = [
      { id: 'w-r-d1', type: 'r', color: 'w', square: 'd1' }
    ];
    const field = computeOpticalField(rookPieces);

    const affected = new Set<Square>();
    for (const ray of field.rays) {
      if (ray.sourcePiece.square === 'd1' && ray.direction[0] === 0 && ray.direction[1] === 1) {
        for (const sq of ray.path) {
          affected.add(sq);
        }
      }
    }

    // d2 through d8 = 7 contiguous squares in column d (f=3)
    expect(affected.size).toBe(7);

    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // For a 1x7 column of contiguous squares:
    // Only 1 top edge (at d8, top of column)
    // Only 1 bottom edge (at d2, bottom of column)
    // 7 left edge segments (forming one continuous left wall)
    // 7 right edge segments (forming one continuous right wall)
    // ZERO internal horizontal dividing lines between d2/d3, d3/d4, etc.!
    const topEdges = edges.filter(e => e.type === 'top');
    const bottomEdges = edges.filter(e => e.type === 'bottom');

    expect(topEdges.length).toBe(1);
    expect(bottomEdges.length).toBe(1);

    // Total horizontal edges is exactly 2 (outer caps only)
    const horizontalEdges = edges.filter(e => e.type === 'top' || e.type === 'bottom');
    expect(horizontalEdges.length).toBe(2);
  });

  it('for King: should omit all internal subdivisions within the 8 surrounding squares', () => {
    // King on e4: influences 8 squares: d5, e5, f5, d4, f4, d3, e3, f3
    const kingPieces: BoardPiece[] = [
      { id: 'w-k-e4', type: 'k', color: 'w', square: 'e4' }
    ];
    const field = computeOpticalField(kingPieces);

    const affected = new Set<Square>();
    for (const ray of field.rays) {
      if (ray.sourcePiece.square === 'e4') {
        for (const sq of ray.path) {
          affected.add(sq);
        }
      }
    }
    expect(affected.size).toBe(8);

    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // In a 3x3 ring with center hole:
    // Outer perimeter: 3 top, 3 bottom, 3 left, 3 right = 12 outer edges
    // Inner hole perimeter: 1 top (for e3), 1 bottom (for e5), 1 left (for f4), 1 right (for d4) = 4 inner edges
    // Total edges = 16 edges (12 outer + 4 inner)
    // Under the old system: 8 squares * 4 edges = 32 edges (16 internal subdivisions!)
    // Now all 16 internal subdivisions are eliminated!
    expect(edges.length).toBe(16);

    // Verify no internal subdivision between adjacent ring cells:
    // e.g. between d5 and e5 (both in row r=3, f=3 and f=4):
    // d5 right edge must NOT exist, e5 left edge must NOT exist
    const d5Right = edges.find(e => e.f === 3 && e.r === 3 && e.type === 'right');
    const e5Left = edges.find(e => e.f === 4 && e.r === 3 && e.type === 'left');
    expect(d5Right).toBeUndefined();
    expect(e5Left).toBeUndefined();
  });

  it('for Queen: should omit internal subdivisions along both orthogonal and contiguous areas', () => {
    // Queen on d4 on an empty board
    const queenPieces: BoardPiece[] = [
      { id: 'w-q-d4', type: 'q', color: 'w', square: 'd4' }
    ];
    const field = computeOpticalField(queenPieces);

    const affected = new Set<Square>();
    for (const ray of field.rays) {
      if (ray.sourcePiece.square === 'd4') {
        for (const sq of ray.path) {
          affected.add(sq);
        }
      }
    }

    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // Along vertical ray d5..d8:
    // Check that there is NO horizontal edge between d5 and d6
    // d5 is f=3, rank 4 -> r=3; d6 is f=3, rank 5 -> r=2
    const d5Top = edges.find(e => e.f === 3 && e.r === 3 && e.type === 'top');
    const d6Bottom = edges.find(e => e.f === 3 && e.r === 2 && e.type === 'bottom');
    expect(d5Top).toBeUndefined();
    expect(d6Bottom).toBeUndefined();

    // Along horizontal ray e4..h4 (rank 4 -> r=4):
    // Check that there is NO vertical edge between e4 and f4
    // e4 is f=4, r=4; f4 is f=5, r=4
    const e4Right = edges.find(e => e.f === 4 && e.r === 4 && e.type === 'right');
    const f4Left = edges.find(e => e.f === 5 && e.r === 4 && e.type === 'left');
    expect(e4Right).toBeUndefined();
    expect(f4Left).toBeUndefined();
  });
});

describe('Selection Mode: Multi-Piece Selection & Influence Highlighting', () => {
  it('should calculate influence for any single selected piece regardless of turn', () => {
    const game = new OpticalChessGame(); // White to move
    const pieces = game.getAllPieces();
    const field = computeOpticalField(pieces);

    // Select Black pawn on e7 (Black piece when it is White's turn)
    const selectedSquares = new Set<Square>(['e7']);

    const influence = new Set<Square>();
    for (const ray of field.rays) {
      if (selectedSquares.has(ray.sourcePiece.square)) {
        for (const sq of ray.path) {
          influence.add(sq);
        }
      }
    }

    // Black pawn on e7 attacks d6 and f6
    expect(influence.size).toBe(2);
    expect(influence.has('d6')).toBe(true);
    expect(influence.has('f6')).toBe(true);
  });

  it('should calculate combined influence when selecting multiple pieces from any side', () => {
    const game = new OpticalChessGame();
    const pieces = game.getAllPieces();
    const field = computeOpticalField(pieces);

    // Select White knight on b1 AND Black knight on g8 (multi-piece, both sides simultaneously)
    const selectedSquares = new Set<Square>(['b1', 'g8']);

    const influence = new Set<Square>();
    for (const ray of field.rays) {
      if (selectedSquares.has(ray.sourcePiece.square)) {
        for (const sq of ray.path) {
          influence.add(sq);
        }
      }
    }

    // White knight on b1 influences: a3, c3
    expect(influence.has('a3')).toBe(true);
    expect(influence.has('c3')).toBe(true);

    // Black knight on g8 influences: f6, h6
    expect(influence.has('f6')).toBe(true);
    expect(influence.has('h6')).toBe(true);

    // Combined influence includes squares from both White and Black pieces
    expect(influence.size).toBeGreaterThanOrEqual(4);
  });

  it('should dynamically update influence when toggling pieces into and out of selection', () => {
    const game = new OpticalChessGame();
    const pieces = game.getAllPieces();
    const field = computeOpticalField(pieces);

    // Initial state: empty selection
    const selectedSquares = new Set<Square>();
    const getInfluence = () => {
      const res = new Set<Square>();
      for (const ray of field.rays) {
        if (selectedSquares.has(ray.sourcePiece.square)) {
          for (const sq of ray.path) {
            res.add(sq);
          }
        }
      }
      return res;
    };

    expect(getInfluence().size).toBe(0);

    // Toggle on: select White pawn e2
    selectedSquares.add('e2');
    expect(getInfluence().has('d3')).toBe(true);
    expect(getInfluence().has('f3')).toBe(true);

    // Toggle on: select White pawn d2
    selectedSquares.add('d2');
    expect(getInfluence().has('c3')).toBe(true);
    expect(getInfluence().has('e3')).toBe(true);

    // Toggle on: select Black pawn d7
    selectedSquares.add('d7');
    expect(getInfluence().has('c6')).toBe(true);
    expect(getInfluence().has('e6')).toBe(true);

    // Toggle off: deselect e2
    selectedSquares.delete('e2');
    expect(getInfluence().has('f3')).toBe(false);
    expect(getInfluence().has('c3')).toBe(true);
    expect(getInfluence().has('c6')).toBe(true);

    // Clear all
    selectedSquares.clear();
    expect(getInfluence().size).toBe(0);
  });

  it('should correctly compute edges with flipped board perspective', () => {
    // With flipped = true, a8 is at bottom-right, h1 is at top-left
    const affected = new Set<Square>(['d4', 'e4']);
    const edgesNormal = computeHighlightEdges(affected, squareSize, false, inset);
    const edgesFlipped = computeHighlightEdges(affected, squareSize, true, inset);

    // Both perspectives must produce the same number of exterior edges and omit internal subdivisions
    expect(edgesFlipped.length).toBe(edgesNormal.length);
    expect(edgesFlipped.length).toBe(6);

    // Internal vertical edge must still be omitted when flipped
    const rightEdges = edgesFlipped.filter(e => e.type === 'right');
    const leftEdges = edgesFlipped.filter(e => e.type === 'left');
    expect(rightEdges.length).toBe(1);
    expect(leftEdges.length).toBe(1);
  });

  it('should merge contiguous influence areas when multiple pieces influence adjacent squares', () => {
    // White king on e4 and white rook on e1:
    // King influences e5, d5, f5, d4, f4, d3, e3, f3
    // Rook on e1 influences e2, e3, e4 (rook ray going up to e4 king obstacle)
    // Here e3 is influenced by both! e2 is adjacent to e3!
    const testPieces: BoardPiece[] = [
      { id: 'w-k-e4', type: 'k', color: 'w', square: 'e4' },
      { id: 'w-r-e1', type: 'r', color: 'w', square: 'e1' }
    ];
    const field = computeOpticalField(testPieces);

    const affected = new Set<Square>();
    for (const ray of field.rays) {
      for (const sq of ray.path) {
        affected.add(sq);
      }
    }

    // Both pieces together influence e2 and e3. e2 and e3 are vertically adjacent.
    expect(affected.has('e2')).toBe(true);
    expect(affected.has('e3')).toBe(true);

    const edges = computeHighlightEdges(affected, squareSize, false, inset);

    // e2 is f=4, rank 1 -> r=6; e3 is f=4, rank 2 -> r=5
    // There must be NO top edge for e2 and NO bottom edge for e3 (internal horizontal division omitted!)
    const e2Top = edges.find(e => e.f === 4 && e.r === 6 && e.type === 'top');
    const e3Bottom = edges.find(e => e.f === 4 && e.r === 5 && e.type === 'bottom');
    expect(e2Top).toBeUndefined();
    expect(e3Bottom).toBeUndefined();
  });
});
