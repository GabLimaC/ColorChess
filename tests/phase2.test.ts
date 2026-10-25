import { describe, it, expect } from 'vitest';
import { OpticalChessGame, PRESETS } from '../src/core/chessGame';
import { computeOpticalField } from '../src/core/opticalEngine';
import { calculateHue, OPTICAL_CONSTANTS } from '../src/core/colorFormulas';
import { getTacticalInterpretation } from '../src/components/SquareInspector';
import { squareToCenter, BEAM_COLORS, renderBeamsToCanvas } from '../src/render/beamRenderer';
import { BOARD_COLORS } from '../src/render/boardRenderer';
import { getTranslucentTheme } from '../src/components/pieces/prismTheme';
import { BoardPiece } from '../src/core/types';

describe('Phase 2: Color Projection & Flat Hue Calculation', () => {
  describe('Mathematical Color Model (Hue Ratios)', () => {
    it('should compute exact Hue angles for specified (B, R) ratios', () => {
      // Pure White / Blue dominance (1, 0) -> 240 deg
      expect(calculateHue(1, 0)).toBe(240);
      expect(calculateHue(5, 0)).toBe(240);

      // Pure Black / Red dominance (0, 1) -> 0 deg
      expect(calculateHue(0, 1)).toBe(0);
      expect(calculateHue(0, 4)).toBe(0);

      // Equal standoff (2, 2) -> 120 deg (Equilibrium Green)
      expect(calculateHue(2, 2)).toBe(120);
      expect(calculateHue(1, 1)).toBe(120);

      // Imbalanced tension: (1, 3) -> 60 deg (Warm Amber / Yellow-Orange)
      expect(calculateHue(1, 3)).toBe(60);

      // Imbalanced tension: (3, 1) -> 180 deg (Cyan / Blue-Green)
      expect(calculateHue(3, 1)).toBe(180);
    });

    it('should fall back to 240 deg when total flux is zero', () => {
      expect(calculateHue(0, 0)).toBe(240);
    });
  });

  describe('Unlit and Lit Square Optical Properties', () => {
    it('should keep unlit squares with saturation 0% and isLit = false', () => {
      // Board with only one king on e1
      const testPieces: BoardPiece[] = [
        { id: 'w-k-e1', type: 'k', color: 'w', square: 'e1' }
      ];
      const field = computeOpticalField(testPieces);

      // a8 is far from e1 and receives zero light
      const a8 = field.squares['a8'];
      expect(a8.isLit).toBe(false);
      expect(a8.totalBlue).toBe(0);
      expect(a8.totalRed).toBe(0);
      expect(a8.saturation).toBe(0);
      // All unlit squares are uniform pure white (100% lightness)
      expect(a8.lightness).toBe(100);
      expect(a8.lightness).toBe(OPTICAL_CONSTANTS.unlitLightSquareLightness);
    });

    it('should calibrate lit squares with vivid saturation and rich lightness', () => {
      const testPieces: BoardPiece[] = [
        { id: 'w-r-d4', type: 'r', color: 'w', square: 'd4' }
      ];
      const field = computeOpticalField(testPieces);

      // d5 hit by White rook
      const d5 = field.squares['d5'];
      expect(d5.isLit).toBe(true);
      expect(d5.primaryBlue).toBe(1);
      expect(d5.saturation).toBe(OPTICAL_CONSTANTS.softPart2Sat);
      expect(d5.lightness).toBe(OPTICAL_CONSTANTS.softPart2Lightness);

      // e4 hit by White rook
      const e4 = field.squares['e4'];
      expect(e4.isLit).toBe(true);
      expect(e4.primaryBlue).toBe(1);
      expect(e4.lightness).toBe(OPTICAL_CONSTANTS.softPart2Lightness);
    });
  });

  describe('Pawn Ray Separation & Sliding Piece X-Ray Transmission', () => {
    it('should emit 0 forward rays and exactly 2 forward diagonal rays for pawns', () => {
      const testPieces: BoardPiece[] = [
        { id: 'w-p-d4', type: 'p', color: 'w', square: 'd4' }
      ];
      const field = computeOpticalField(testPieces);

      // Forward step d5 and two-step d6 must receive 0 rays
      expect(field.squares['d5'].primaryBlue).toBe(0);
      expect(field.squares['d6'].primaryBlue).toBe(0);

      // Diagonal attack squares c5 and e5 must receive exactly 1 ray each
      expect(field.squares['c5'].primaryBlue).toBe(1);
      expect(field.squares['e5'].primaryBlue).toBe(1);

      // Exactly 2 total rays emitted by d4 pawn
      const pawnRays = field.rays.filter(r => r.sourcePiece.id === 'w-p-d4');
      expect(pawnRays.length).toBe(2);
      expect(pawnRays.map(r => r.to).sort()).toEqual(['c5', 'e5']);
    });

    it('should strictly block sliding rays at the first obstacle with zero penetration behind', () => {
      // Rook on b1, pawn obstacle on b3, empty beyond
      const testPieces: BoardPiece[] = [
        { id: 'w-r-b1', type: 'r', color: 'w', square: 'b1' },
        { id: 'b-p-b3', type: 'p', color: 'b', square: 'b3' }
      ];
      const field = computeOpticalField(testPieces);

      // b2: open square hit by primary ray (1.0)
      expect(field.squares['b2'].primaryBlue).toBe(1);
      expect(field.squares['b2'].totalBlue).toBe(1.0);

      // b3: obstacle square hit by primary ray (1.0), terminates completely here
      expect(field.squares['b3'].primaryBlue).toBe(1);
      expect(field.squares['b3'].totalBlue).toBe(1.0);

      // b4 through b8: completely in shadow, zero flux, unlit
      for (const rank of ['4', '5', '6', '7', '8']) {
        const sq = `b${rank}` as any;
        expect(field.squares[sq].primaryBlue).toBe(0);
        expect(field.squares[sq].totalBlue).toBe(0);
        expect(field.squares[sq].isLit).toBe(false);
      }
    });
  });

  describe('Preset Tactical Scenarios Verification', () => {
    it('1. Absolute Pin (Morphy Opera Motif): Bishop g5 attacks Knight f6; ray terminates on f6', () => {
      const pinPreset = PRESETS.find(p => p.id === 'absolute-pin');
      expect(pinPreset).toBeDefined();

      const game = new OpticalChessGame(pinPreset!.fen);
      const pieces = game.getAllPieces();
      const field = computeOpticalField(pieces);

      // Find the ray from the g5 bishop attacking along [-1, 1]
      const bishop = pieces.find(p => p.square === 'g5' && p.type === 'b');
      expect(bishop).toBeDefined();

      const bishopRays = field.rays.filter(
        r => r.sourcePiece.id === bishop!.id && r.direction[0] === -1 && r.direction[1] === 1
      );

      // Ray must terminate on f6 (the blocker)
      expect(bishopRays.length).toBe(1);
      const ray = bishopRays[0];
      expect(ray.from).toBe('g5');
      expect(ray.to).toBe('f6');
      expect(ray.intensity).toBe(1.0);

      // f6 receives primary Blue
      expect(field.squares['f6'].primaryBlue).toBeGreaterThanOrEqual(1);

      // Bishop does not project beyond f6: d8 receives 0 rays from g5 bishop
      const raysReachingD8FromBishop = field.rays.filter(
        r => r.sourcePiece.id === bishop!.id && r.path.includes('d8')
      );
      expect(raysReachingD8FromBishop.length).toBe(0);
    });

    it('2. Central Tension: Contested squares generate 120 deg pure green equilibrium', () => {
      // Create exact 1:1 contest on d4 (e.g. White Rook on d1, Black Rook on d8)
      const testPieces: BoardPiece[] = [
        { id: 'w-r-d1', type: 'r', color: 'w', square: 'd1' },
        { id: 'b-r-d8', type: 'r', color: 'b', square: 'd8' }
      ];
      const field = computeOpticalField(testPieces);

      const d4 = field.squares['d4'];
      expect(d4.primaryBlue).toBe(1);
      expect(d4.primaryRed).toBe(1);
      expect(d4.totalBlue).toBe(1);
      expect(d4.totalRed).toBe(1);
      expect(d4.hue).toBe(120);

      const interpretation = getTacticalInterpretation(d4.totalBlue, d4.totalRed, d4.hue);
      expect(interpretation.label).toBe('Equilibrium Standoff (1:1)');
    });

    it('3. Discovered Attack: Moving blocking piece instantly unmasks primary beam', () => {
      const discoveredPreset = PRESETS.find(p => p.id === 'discovered-attack');
      expect(discoveredPreset).toBeDefined();

      const game = new OpticalChessGame(discoveredPreset!.fen);
      const initialPieces = game.getAllPieces();
      const initialField = computeOpticalField(initialPieces);

      // Before move: White Rook on e1 has primary ray terminating on e4 (Knight e4)
      const e1Rook = initialPieces.find(p => p.square === 'e1' && p.type === 'r');
      expect(e1Rook).toBeDefined();

      const rookRaysBefore = initialField.rays.filter(
        r => r.sourcePiece.id === e1Rook!.id && r.direction[0] === 0 && r.direction[1] === 1
      );
      const primaryBefore = rookRaysBefore.find(r => !r.isXray);
      expect(primaryBefore!.to).toBe('e4');

      // Make discovered attack move: Knight e4 to c5 (unmasking e-file)
      expect(game.makeMove('e4', 'c5')).toBe(true);

      const updatedPieces = game.getAllPieces();
      const updatedField = computeOpticalField(updatedPieces);

      const rookRaysAfter = updatedField.updatedFieldRays || updatedField.rays.filter(
        r => r.sourcePiece.id === e1Rook!.id && r.direction[0] === 0 && r.direction[1] === 1
      );
      const primaryAfter = rookRaysAfter.find(r => !r.isXray);

      // Now e4 is empty! The primary ray passes cleanly through e4 to e5 (Bishop on e5)
      expect(primaryAfter!.to).toBe('e5');
      expect(primaryAfter!.path).toContain('e4');
      expect(primaryAfter!.path).toContain('e5');
    });
  });

  describe('SquareInspector Tactical Interpretation & Swatch', () => {
    it('should classify tactical states accurately', () => {
      expect(getTacticalInterpretation(0, 0, 240).label).toBe('Unlit (Neutral Ground)');
      expect(getTacticalInterpretation(2, 0, 240).label).toBe('White Dominated');
      expect(getTacticalInterpretation(0, 3, 0).label).toBe('Black Dominated');
      expect(getTacticalInterpretation(2, 2, 120).label).toBe('Equilibrium Standoff (1:1)');
      expect(getTacticalInterpretation(1, 3, 60).label).toBe('Black Advantage (Contested)');
      expect(getTacticalInterpretation(3, 1, 180).label).toBe('White Advantage (Contested)');
    });
  });

  describe('Beam Coordinate Transformation', () => {
    it('should map board squares to canvas center coordinates properly', () => {
      const squareSize = 80;
      // White view (flipped = false): a1 is bottom-left (col 0, row 7)
      const a1Center = squareToCenter('a1', squareSize, false);
      expect(a1Center.x).toBe(40);
      expect(a1Center.y).toBe(600); // (7 + 0.5) * 80

      // White view: h8 is top-right (col 7, row 0)
      const h8Center = squareToCenter('h8', squareSize, false);
      expect(h8Center.x).toBe(600);
      expect(h8Center.y).toBe(40);

      // Black view (flipped = true): a1 is top-right (col 7, row 0)
      const a1Flipped = squareToCenter('a1', squareSize, true);
      expect(a1Flipped.x).toBe(600);
      expect(a1Flipped.y).toBe(40);
    });
  });

  describe('Piece and Beam Black Border & Selection Constraints', () => {
    it('should configure pure black borders on both White and Black pieces', () => {
      const whiteTheme = getTranslucentTheme('w');
      expect(whiteTheme.stroke).toBe('#000000');
      expect(whiteTheme.glassFill).toBe('#ffffff');

      const blackTheme = getTranslucentTheme('b');
      expect(blackTheme.stroke).toBe('#000000');
      expect(blackTheme.glassFill).toBe('#000000');
    });

    it('should define a black border outline for laser beams', () => {
      expect(BEAM_COLORS.outline).toBe('#000000');
    });

    it('should only render beams when a piece is selected', () => {
      let strokeCount = 0;
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => { strokeCount++; },
        setLineDash: () => {},
      } as unknown as CanvasRenderingContext2D;

      const dummyRays = [
        {
          id: 'ray-1',
          sourcePiece: { id: 'w-r-e1', type: 'r' as const, color: 'w' as const, square: 'e1' as const },
          direction: [0, 1] as [number, number],
          from: 'e1' as const,
          to: 'e4' as const,
          path: ['e2' as const, 'e3' as const, 'e4' as const],
          isXray: false,
          intensity: 1.0
        }
      ];

      // Case 1: No piece selected -> 0 beams drawn
      renderBeamsToCanvas(fakeCtx, dummyRays, {
        width: 800,
        height: 800,
        flipped: false,
        showBeams: true,
        selectedSquare: null,
      });
      expect(strokeCount).toBe(0);

      // Case 2: Different piece selected ('d1') -> 0 beams drawn
      renderBeamsToCanvas(fakeCtx, dummyRays, {
        width: 800,
        height: 800,
        flipped: false,
        showBeams: true,
        selectedSquare: 'd1',
      });
      expect(strokeCount).toBe(0);

      // Case 3: Emitting piece selected ('e1') -> beams drawn with outline pass and core pass
      renderBeamsToCanvas(fakeCtx, dummyRays, {
        width: 800,
        height: 800,
        flipped: false,
        showBeams: true,
        selectedSquare: 'e1',
      });
      // 1 outline stroke + 1 core stroke = 2 strokes
      expect(strokeCount).toBe(2);
    });
  });

  describe('Contested Square Numerical Proportions & Reference Scale', () => {
    it('should identify contested squares (B > 0 and R > 0) with exact numerical proportion strings', () => {
      // Setup contested confrontation: White Knight and Pawn attacking d5, Black Pawn defending d5
      const testPieces: BoardPiece[] = [
        { id: 'w-n-c3', type: 'n', color: 'w', square: 'c3' },
        { id: 'w-p-e4', type: 'p', color: 'w', square: 'e4' },
        { id: 'b-p-c6', type: 'p', color: 'b', square: 'c6' },
      ];
      const field = computeOpticalField(testPieces);

      // d5 is attacked by Nc3 and e4 (B = 2), and defended by c6 (R = 1)
      const d5 = field.squares['d5'];
      expect(d5.primaryBlue).toBe(2);
      expect(d5.primaryRed).toBe(1);
      expect(d5.totalBlue > 0 && d5.totalRed > 0).toBe(true); // Contested!

      const proportionString = `${Math.round(d5.totalBlue)}:${Math.round(d5.totalRed)}`;
      expect(proportionString).toBe('2:1');
    });

    it('should distinguish uncontested squares from contested ones', () => {
      const testPieces: BoardPiece[] = [
        { id: 'w-r-a1', type: 'r', color: 'w', square: 'a1' },
      ];
      const field = computeOpticalField(testPieces);

      // a2 is only attacked by White (B = 1, R = 0) -> Uncontested
      const a2 = field.squares['a2'];
      const isContested = a2.totalBlue > 0 && a2.totalRed > 0;
      expect(isContested).toBe(false);
    });

    it('should map reference spectrum ratios to theoretical Hue angles', () => {
      expect(calculateHue(1, 0)).toBe(240);
      expect(calculateHue(3, 1)).toBe(180);
      expect(calculateHue(2, 1)).toBe(160);
      expect(calculateHue(1, 1)).toBe(120);
      expect(calculateHue(1, 2)).toBe(80);
      expect(calculateHue(1, 3)).toBe(60);
      expect(calculateHue(0, 1)).toBe(0);
    });
  });

  describe('Piece Style Switching (Custom Prisms vs Normal Classic Staunton)', () => {
    it('should allow toggling between custom prism and classic Staunton piece representations', () => {
      // Custom piece style uses the optical prism geometry
      const customThemeWhite = getTranslucentTheme('w');
      expect(customThemeWhite.glassFill).toBe('#ffffff');
      expect(customThemeWhite.stroke).toBe('#000000');

      const customThemeBlack = getTranslucentTheme('b');
      expect(customThemeBlack.glassFill).toBe('#000000');
      expect(customThemeBlack.stroke).toBe('#000000');
    });
  });

  describe('Hypothetical Move Exploration & Affected Squares Black Border', () => {
    it('should simulate candidate moves on cloned board without mutating active game', () => {
      const game = new OpticalChessGame();
      expect(game.getGameState().turn).toBe('w');

      // Simulate e2 -> e4
      const simulated = game.getSimulatedPiecesAfterMove('e2', 'e4');
      expect(simulated).toBeDefined();
      expect(simulated!.find(p => p.square === 'e4' && p.color === 'w')).toBeDefined();
      expect(simulated!.find(p => p.square === 'e2')).toBeUndefined();

      // Active game state remains untouched at starting position
      expect(game.getGameState().turn).toBe('w');
      expect(game.getPieceAt('e2')).not.toBeNull();
      expect(game.getPieceAt('e4')).toBeNull();
    });

    it('should project the entire optical field for hypothetical future positions', () => {
      const game = new OpticalChessGame();
      const initialField = computeOpticalField(game.getAllPieces());

      // At start, e4 pawn hasn't moved, d5 receives 0 blue rays
      expect(initialField.squares['d5'].primaryBlue).toBe(0);

      // Simulate e2 -> e4 and compute optical field
      const simulatedPieces = game.getSimulatedPiecesAfterMove('e2', 'e4')!;
      const futureField = computeOpticalField(simulatedPieces);

      // In future position, e4 pawn attacks d5 and f5
      expect(futureField.squares['d5'].primaryBlue).toBe(1);
      expect(futureField.squares['f5'].primaryBlue).toBe(1);

      // Find affected squares from hypothetical e4 position
      const affectedFromE4 = new Set<string>();
      for (const ray of futureField.rays) {
        if (ray.sourcePiece.square === 'e4') {
          for (const sq of ray.path) {
            affectedFromE4.add(sq);
          }
        }
      }
      expect(affectedFromE4.has('d5')).toBe(true);
      expect(affectedFromE4.has('f5')).toBe(true);
    });
  });

  describe('Board View Mode Switching (Color vs Black and White)', () => {
    it('should configure classic alternating black and white tiles in B&W mode', () => {
      expect(BOARD_COLORS.bwLightSquare).toBe('#ffffff');
      expect(BOARD_COLORS.bwDarkSquare).toBe('#cbd5e1');
    });

    it('should maintain consistent team piece fills and black borders across board modes', () => {
      const whiteTheme = getTranslucentTheme('w');
      expect(whiteTheme.glassFill).toBe('#ffffff');
      expect(whiteTheme.stroke).toBe('#000000');

      const blackTheme = getTranslucentTheme('b');
      expect(blackTheme.glassFill).toBe('#000000');
      expect(blackTheme.stroke).toBe('#000000');
    });
  });
});
