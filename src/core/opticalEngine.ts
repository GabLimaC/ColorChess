import {
  Square,
  BoardPiece,
  Ray,
  SquareOpticalState,
  OpticalField
} from './types';
import {
  ALL_SQUARES,
  squareToFileRank,
  fileRankToSquare,
  isDarkSquare
} from './chessGame';
import {
  calculateHue,
  calculateLogSaturation,
  OPTICAL_CONSTANTS
} from './colorFormulas';

export interface OpticalEngineOptions {
  xrayTransmission?: number;
  useLogSaturation?: boolean;
}

export function computeOpticalField(
  pieces: BoardPiece[],
  options: OpticalEngineOptions = {}
): OpticalField {
  const useLogSat = options.useLogSaturation ?? false;

  // Map piece locations for quick O(1) occupancy lookup
  const pieceMap = new Map<Square, BoardPiece>();
  pieces.forEach(p => pieceMap.set(p.square, p));

  const rays: Ray[] = [];

  // Temporary accumulators per square
  const squareAccumulators: Record<
    Square,
    {
      primaryBlue: number;
      primaryRed: number;
      xrayBlue: number;
      xrayRed: number;
    }
  > = {} as any;

  for (const sq of ALL_SQUARES) {
    squareAccumulators[sq] = {
      primaryBlue: 0,
      primaryRed: 0,
      xrayBlue: 0,
      xrayRed: 0
    };
  }

  // Helper to add rays
  for (const piece of pieces) {
    const isWhite = piece.color === 'w';
    const { file: f, rank: r } = squareToFileRank(piece.square);

    switch (piece.type) {
      case 'p': {
        // Pawns: ONLY forward diagonal capture squares emit attack rays
        const dr = isWhite ? 1 : -1;
        const attackDirs = [-1, 1];

        for (const df of attackDirs) {
          const targetSq = fileRankToSquare(f + df, r + dr);
          if (targetSq) {
            if (isWhite) {
              squareAccumulators[targetSq].primaryBlue += 1;
            } else {
              squareAccumulators[targetSq].primaryRed += 1;
            }

            rays.push({
              id: `ray-${piece.id}-to-${targetSq}`,
              sourcePiece: piece,
              direction: [df, dr],
              from: piece.square,
              to: targetSq,
              path: [targetSq],
              isXray: false,
              intensity: 1.0
            });
          }
        }
        break;
      }

      case 'n': {
        // Knights: 8 discrete L-jumps
        const knightOffsets: [number, number][] = [
          [1, 2], [2, 1], [2, -1], [1, -2],
          [-1, -2], [-2, -1], [-2, 1], [-1, 2]
        ];

        for (const [df, dr] of knightOffsets) {
          const targetSq = fileRankToSquare(f + df, r + dr);
          if (targetSq) {
            if (isWhite) {
              squareAccumulators[targetSq].primaryBlue += 1;
            } else {
              squareAccumulators[targetSq].primaryRed += 1;
            }

            rays.push({
              id: `ray-${piece.id}-to-${targetSq}`,
              sourcePiece: piece,
              direction: [df, dr],
              from: piece.square,
              to: targetSq,
              path: [targetSq],
              isXray: false,
              intensity: 1.0
            });
          }
        }
        break;
      }

      case 'k': {
        // Kings: 8 adjacent squares
        const kingOffsets: [number, number][] = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        for (const [df, dr] of kingOffsets) {
          const targetSq = fileRankToSquare(f + df, r + dr);
          if (targetSq) {
            if (isWhite) {
              squareAccumulators[targetSq].primaryBlue += 1;
            } else {
              squareAccumulators[targetSq].primaryRed += 1;
            }

            rays.push({
              id: `ray-${piece.id}-to-${targetSq}`,
              sourcePiece: piece,
              direction: [df, dr],
              from: piece.square,
              to: targetSq,
              path: [targetSq],
              isXray: false,
              intensity: 1.0
            });
          }
        }
        break;
      }

      case 'b':
      case 'r':
      case 'q': {
        // Sliding pieces: continuous vectors
        const directions: [number, number][] = [];
        if (piece.type === 'b' || piece.type === 'q') {
          directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
          directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        }

        for (const [df, dr] of directions) {
          let step = 1;
          const primaryPath: Square[] = [];

          while (true) {
            const curFile = f + df * step;
            const curRank = r + dr * step;
            const curSq = fileRankToSquare(curFile, curRank);
            if (!curSq) break; // Reached board boundary

            primaryPath.push(curSq);
            if (isWhite) {
              squareAccumulators[curSq].primaryBlue += 1;
            } else {
              squareAccumulators[curSq].primaryRed += 1;
            }

            const pieceAtSq = pieceMap.get(curSq);
            if (pieceAtSq) {
              // Physical obstacle hit: strict 100% occlusion terminates ray on this square
              break;
            }

            step++;
          }

          // Register ray if path not empty
          if (primaryPath.length > 0) {
            rays.push({
              id: `ray-p-${piece.id}-dir-${df}-${dr}`,
              sourcePiece: piece,
              direction: [df, dr],
              from: piece.square,
              to: primaryPath[primaryPath.length - 1],
              path: primaryPath,
              isXray: false,
              intensity: 1.0
            });
          }
        }
        break;
      }
    }
  }

  // Calculate final square states
  const squares: Record<Square, SquareOpticalState> = {} as any;
  let totalBlueFlux = 0;
  let totalRedFlux = 0;

  for (const sq of ALL_SQUARES) {
    const acc = squareAccumulators[sq];
    const { file, rank } = squareToFileRank(sq);
    const dark = isDarkSquare(file, rank);

    const totalB = acc.primaryBlue;
    const totalR = acc.primaryRed;

    totalBlueFlux += totalB;
    totalRedFlux += totalR;

    const isLit = totalB + totalR > 0.001;

    let hue = 240;
    let saturation = 0;
    let lightness = OPTICAL_CONSTANTS.unlitLightSquareLightness; // Pure white 100%

    if (isLit) {
      hue = calculateHue(totalB, totalR);
      if (useLogSat) {
        saturation = calculateLogSaturation(totalB, totalR);
        lightness = OPTICAL_CONSTANTS.softPart2Lightness;
      } else {
        // Vivid baseline for clearly visible color field
        saturation = OPTICAL_CONSTANTS.softPart2Sat;
        lightness = OPTICAL_CONSTANTS.softPart2Lightness;
      }
    }

    squares[sq] = {
      square: sq,
      file,
      rank,
      isDarkSquare: dark,
      primaryBlue: acc.primaryBlue,
      primaryRed: acc.primaryRed,
      xrayBlue: 0,
      xrayRed: 0,
      totalBlue: totalB,
      totalRed: totalR,
      hue,
      saturation,
      lightness,
      isLit
    };
  }

  return {
    squares,
    rays,
    totalBlueFlux: Math.round(totalBlueFlux * 100) / 100,
    totalRedFlux: Math.round(totalRedFlux * 100) / 100
  };
}
