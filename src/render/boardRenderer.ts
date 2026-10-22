import { Square, OpticalField, BoardMode } from '../core/types';
import { fileRankToSquare, isDarkSquare } from '../core/chessGame';
import { toHslString, OPTICAL_CONSTANTS } from '../core/colorFormulas';

export interface BoardRenderOptions {
  width: number;
  height: number;
  flipped: boolean;
  selectedSquare: Square | null;
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  hoverSquare: Square | null;
  opticalField?: OpticalField | null;
  affectedSquares?: Set<Square> | null;
  boardMode?: BoardMode;
}

export const BOARD_COLORS = {
  // Pure optical white laboratory board (all squares uniform white in color mode)
  square: '#ffffff',
  lightSquare: '#ffffff',
  darkSquare: '#ffffff',
  // Classic Black & White tournament board
  bwLightSquare: '#ffffff',
  bwDarkSquare: '#cbd5e1',
  gridLine: 'rgba(148, 163, 184, 0.45)',
  coord: '#64748b',
  coordDark: '#64748b',
  coordLight: '#64748b',
};

export interface HighlightEdge {
  type: 'top' | 'bottom' | 'left' | 'right';
  f: number;
  r: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
}

/**
 * Computes the exterior boundary edges for highlighted influence squares.
 * Squares in the same contiguous area omit internal subdivisions.
 */
export function computeHighlightEdges(
  affectedSquares: Set<Square>,
  squareSize: number,
  flipped: boolean,
  inset = 1.25
): HighlightEdge[] {
  if (!affectedSquares || affectedSquares.size === 0) return [];

  const isAffected = (f: number, r: number): boolean => {
    if (f < 0 || f > 7 || r < 0 || r > 7) return false;
    const displayFile = flipped ? 7 - f : f;
    const displayRank = flipped ? r : 7 - r;
    const sq = fileRankToSquare(displayFile, displayRank);
    return sq !== null && affectedSquares.has(sq);
  };

  const edges: HighlightEdge[] = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if (!isAffected(f, r)) continue;

      const x0 = f * squareSize;
      const x1 = (f + 1) * squareSize;
      const y0 = r * squareSize;
      const y1 = (r + 1) * squareSize;

      // 1. Top Edge: exterior boundary only (no cell above in the same area)
      if (!isAffected(f, r - 1)) {
        const hasLeft = isAffected(f - 1, r);
        const hasRight = isAffected(f + 1, r);
        const xStart = hasLeft ? x0 : x0 + inset;
        const xEnd = hasRight ? x1 : x1 - inset;
        const y = y0 + inset;
        edges.push({
          type: 'top',
          f,
          r,
          xStart,
          yStart: y,
          xEnd,
          yEnd: y
        });
      }

      // 2. Bottom Edge: exterior boundary only (no cell below in the same area)
      if (!isAffected(f, r + 1)) {
        const hasLeft = isAffected(f - 1, r);
        const hasRight = isAffected(f + 1, r);
        const xStart = hasLeft ? x0 : x0 + inset;
        const xEnd = hasRight ? x1 : x1 - inset;
        const y = y1 - inset;
        edges.push({
          type: 'bottom',
          f,
          r,
          xStart,
          yStart: y,
          xEnd,
          yEnd: y
        });
      }

      // 3. Left Edge: exterior boundary only (no cell to left in the same area)
      if (!isAffected(f - 1, r)) {
        const hasTop = isAffected(f, r - 1);
        const hasBottom = isAffected(f, r + 1);
        const yStart = hasTop ? y0 : y0 + inset;
        const yEnd = hasBottom ? y1 : y1 - inset;
        const x = x0 + inset;
        edges.push({
          type: 'left',
          f,
          r,
          xStart: x,
          yStart,
          xEnd: x,
          yEnd
        });
      }

      // 4. Right Edge: exterior boundary only (no cell to right in the same area)
      if (!isAffected(f + 1, r)) {
        const hasTop = isAffected(f, r - 1);
        const hasBottom = isAffected(f, r + 1);
        const yStart = hasTop ? y0 : y0 + inset;
        const yEnd = hasBottom ? y1 : y1 - inset;
        const x = x1 - inset;
        edges.push({
          type: 'right',
          f,
          r,
          xStart: x,
          yStart,
          xEnd: x,
          yEnd
        });
      }
    }
  }

  return edges;
}

/**
 * Highlights affected squares with black borders, omitting internal subdivisions
 * in squares in the same area (e.g. for rooks, queen, king, or combined influence).
 */
export function renderInfluenceHighlight(
  ctx: CanvasRenderingContext2D,
  affectedSquares: Set<Square>,
  squareSize: number,
  flipped: boolean
) {
  const edges = computeHighlightEdges(affectedSquares, squareSize, flipped);
  if (edges.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';

  ctx.beginPath();
  for (const edge of edges) {
    ctx.moveTo(edge.xStart, edge.yStart);
    ctx.lineTo(edge.xEnd, edge.yEnd);
  }
  ctx.stroke();

  ctx.restore();
}

export function renderBoardToCanvas(
  ctx: CanvasRenderingContext2D,
  options: BoardRenderOptions
) {
  const { width, height, flipped, boardMode = 'color' } = options;
  const squareSize = width / 8;
  const isBw = boardMode === 'bw';

  ctx.clearRect(0, 0, width, height);

  // 1. Draw 64 squares (classic alternating B&W tiles or optical white/hue tiles)
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const displayFile = flipped ? 7 - f : f;
      const displayRank = flipped ? r : 7 - r;

      const sq = fileRankToSquare(displayFile, displayRank);
      if (!sq) continue;

      const x = f * squareSize;
      const y = r * squareSize;
      const isDark = isDarkSquare(displayFile, displayRank);
      const sqState = options.opticalField?.squares[sq];

      if (isBw) {
        // Classic Black & White board: alternating clean white and silver-slate tiles
        ctx.fillStyle = isDark ? BOARD_COLORS.bwDarkSquare : BOARD_COLORS.bwLightSquare;
      } else {
        // Optical Color Mode: lit squares receive Hue washes, unlit squares are uniform white
        if (sqState && sqState.isLit) {
          const s = sqState.saturation > 0 ? sqState.saturation : OPTICAL_CONSTANTS.softPart2Sat;
          const l = sqState.lightness || OPTICAL_CONSTANTS.softPart2Lightness;
          ctx.fillStyle = toHslString(sqState.hue, s, l);
        } else {
          ctx.fillStyle = BOARD_COLORS.square;
        }
      }
      ctx.fillRect(x, y, squareSize, squareSize);

      // Coordinate notations (rank on left edge, file on bottom edge)
      ctx.font = '600 11px "Fira Code", monospace';
      ctx.fillStyle = isBw && isDark ? '#475569' : BOARD_COLORS.coord;

      if (f === 0) {
        const rankLabel = (displayRank + 1).toString();
        ctx.fillText(rankLabel, x + 4, y + 14);
      }

      if (r === 7) {
        const fileLabel = String.fromCharCode('a'.charCodeAt(0) + displayFile);
        ctx.fillText(fileLabel, x + squareSize - 12, y + squareSize - 4);
      }

      // Draw numerical proportion badge on contested squares (B > 0 and R > 0)
      if (sqState && sqState.totalBlue > 0 && sqState.totalRed > 0) {
        const b = Math.round(sqState.totalBlue);
        const rCount = Math.round(sqState.totalRed);
        const text = `${b}:${rCount}`;

        ctx.save();
        ctx.font = 'bold 9px "Fira Code", monospace';
        const textMetrics = ctx.measureText(text);
        const padX = 4;
        const badgeW = Math.max(22, textMetrics.width + padX * 2);
        const badgeH = 13;
        const badgeX = x + squareSize - badgeW - 3;
        const badgeY = y + 3;

        // Dark pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        // Subtle outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Proportion label
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
        ctx.restore();
      }
    }
  }

  // 2. Optical grid lines
  ctx.strokeStyle = BOARD_COLORS.gridLine;
  ctx.lineWidth = 1;

  for (let i = 1; i < 8; i++) {
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(i * squareSize, 0);
    ctx.lineTo(i * squareSize, height);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, i * squareSize);
    ctx.lineTo(width, i * squareSize);
    ctx.stroke();
  }

  // 3. Highlight affected squares with black borders (omitting internal subdivisions in the same area)
  if (options.affectedSquares && options.affectedSquares.size > 0) {
    renderInfluenceHighlight(ctx, options.affectedSquares, squareSize, flipped);
  }

  // Outer border
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}
