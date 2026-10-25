import { Square, OpticalField, BoardMode, InfluencePattern } from '../core/types';
import { fileRankToSquare, isDarkSquare, squareToFileRank } from '../core/chessGame';
import { OPTICAL_CONSTANTS, toHslString } from '../core/colorFormulas';
import { buildRayIndex, SHAPE_ALPHA } from './lightTypes';
import { paintInfluenceShape, paintSquareLightTypes } from './lightTypeRenderer';

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
  influenceWash?: Record<Square, number> | null;
  influenceHue?: number;
  influencePattern?: InfluencePattern | null;
  influenceTempoBySquare?: Record<Square, number> | null;
  boardMode?: BoardMode;
  lightOpacity?: number;
}

export const BOARD_COLORS = {
  // Pure optical white laboratory board (all squares uniform white in color mode)
  square: '#ffffff',
  lightSquare: '#ffffff',
  darkSquare: '#ffffff',
  // Classic Black & White tournament board
  bwLightSquare: '#ffffff',
  bwDarkSquare: '#cbd5e1',
  gridLine: 'rgba(0, 0, 0, 0.8)',
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

export interface TempoHighlightStyle {
  width: number;
  dash: number[];
  insetRatio: number;
  alpha: number;
}

export const TEMPO_HIGHLIGHT_STYLES: Record<number, TempoHighlightStyle> = {
  1: { width: 2.75, dash: [], insetRatio: 0.03, alpha: 1 },
  2: { width: 2, dash: [6, 4], insetRatio: 0.06, alpha: 0.95 },
  3: { width: 1.5, dash: [2, 3], insetRatio: 0.09, alpha: 0.9 }
};

/**
 * Outlines each tempo layer's newly influenced region with a distinct style:
 * solid = 1 tempo, dashed = 2 tempos, dotted = 3 tempos.
 */
export function renderTempoHighlights(
  ctx: CanvasRenderingContext2D,
  tempoBySquare: Record<Square, number>,
  squareSize: number,
  flipped: boolean,
  hue: number
) {
  const layers = new Map<number, Set<Square>>();
  for (const [square, tempo] of Object.entries(tempoBySquare)) {
    if (tempo <= 0) continue;
    const layer = layers.get(tempo);
    if (layer) {
      layer.add(square as Square);
    } else {
      layers.set(tempo, new Set([square as Square]));
    }
  }

  for (const tempo of [1, 2, 3]) {
    const layer = layers.get(tempo);
    if (!layer || layer.size === 0) continue;

    const style = TEMPO_HIGHLIGHT_STYLES[tempo];
    const edges = computeHighlightEdges(
      layer,
      squareSize,
      flipped,
      squareSize * style.insetRatio
    );
    if (edges.length === 0) continue;

    ctx.save();
    ctx.strokeStyle = toHslString(
      hue,
      OPTICAL_CONSTANTS.softPart2Sat,
      35,
      style.alpha
    );
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash);
    ctx.lineCap = 'square';

    ctx.beginPath();
    for (const edge of edges) {
      ctx.moveTo(edge.xStart, edge.yStart);
      ctx.lineTo(edge.xEnd, edge.yEnd);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function renderBoardToCanvas(
  ctx: CanvasRenderingContext2D,
  options: BoardRenderOptions
) {
  const { width, height, flipped, boardMode = 'color' } = options;
  const squareSize = width / 8;
  const isBw = boardMode === 'bw';
  const isHybrid = boardMode === 'hybrid';
  const raysBySquare = isBw ? null : buildRayIndex(options.opticalField?.rays ?? []);
  const lightAlpha = options.lightOpacity ?? SHAPE_ALPHA;

  ctx.clearRect(0, 0, width, height);

  // 1. Draw 64 squares (classic alternating B&W tiles or optical white tiles with light-type shapes)
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
        ctx.fillRect(x, y, squareSize, squareSize);
      } else {
        // Optical Color Mode: base white (or white/grey pattern in Hybrid mode),
        // then per-piece light shapes plus the aggregate center disc
        ctx.fillStyle = isHybrid
          ? isDark
            ? BOARD_COLORS.bwDarkSquare
            : BOARD_COLORS.bwLightSquare
          : BOARD_COLORS.square;
        ctx.fillRect(x, y, squareSize, squareSize);
        if (sqState && sqState.isLit) {
          paintSquareLightTypes(
            ctx,
            { x, y, size: squareSize },
            raysBySquare?.get(sq) ?? [],
            sqState,
            flipped,
            lightAlpha
          );
        }
      }

      // Piece influence tempo pattern (analysis layer, both board modes)
      const washAlpha = options.influenceWash?.[sq];
      if (washAlpha && washAlpha > 0) {
        const pattern = options.influencePattern;
        if (pattern) {
          const rootPos = squareToFileRank(pattern.root);
          const sqPos = squareToFileRank(sq);
          paintInfluenceShape(
            ctx,
            { x, y, size: squareSize },
            pattern.type,
            pattern.color,
            [sqPos.file - rootPos.file, sqPos.rank - rootPos.rank],
            flipped,
            washAlpha
          );
        } else {
          ctx.fillStyle = toHslString(
            options.influenceHue ?? 240,
            OPTICAL_CONSTANTS.softPart2Sat,
            OPTICAL_CONSTANTS.softPart2Lightness,
            washAlpha
          );
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }

      // Coordinate notations (rank on left edge, file on bottom edge)
      ctx.font = '600 11px "Fira Code", monospace';
      ctx.fillStyle = (isBw || isHybrid) && isDark ? '#475569' : BOARD_COLORS.coord;

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
  ctx.lineWidth = 1.5;

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

  // 3. Tempo layer highlights (newly influenced squares, solid / dashed / dotted)
  if (options.influenceTempoBySquare) {
    renderTempoHighlights(
      ctx,
      options.influenceTempoBySquare,
      squareSize,
      flipped,
      options.influenceHue ?? 240
    );
  }

  // 4. Highlight affected squares with black borders (omitting internal subdivisions in the same area)
  if (options.affectedSquares && options.affectedSquares.size > 0) {
    renderInfluenceHighlight(ctx, options.affectedSquares, squareSize, flipped);
  }

  // Outer border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}
