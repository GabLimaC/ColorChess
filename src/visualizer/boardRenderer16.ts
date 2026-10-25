import { toHslString } from '../core/colorFormulas';
import { V_BOARD_SIZE, V_FILES, fileRankToVSquare } from './movementEngine';
import { SquareInfluence, VSquare } from './types';

export const BOARD16_COLORS = {
  square: '#ffffff',
  gridLine: 'rgba(148, 163, 184, 0.45)',
  coord: '#64748b',
  outerBorder: 'rgba(148, 163, 184, 0.6)',
  highlight: '#000000',
  hoverValid: 'rgba(16, 185, 129, 0.18)',
  hoverIdle: 'rgba(15, 23, 42, 0.07)'
};

export const TEMPO_ALPHA: Record<number, number> = { 1: 1, 2: 0.55, 3: 0.28 };

export interface Board16RenderOptions {
  width: number;
  height: number;
  field: Record<VSquare, SquareInfluence>;
  reachable: VSquare[];
  tempoBySquare: Record<VSquare, number>;
  hoverSquare?: VSquare | null;
  hoverValid?: boolean;
}

export interface HighlightEdge16 {
  type: 'top' | 'bottom' | 'left' | 'right';
  file: number;
  rank: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
}

/**
 * Exterior boundary edges of the reachable region, generalized from the 8x8
 * board renderer to an arbitrary board size.
 */
export function computeHighlightEdges16(
  affectedSquares: Set<VSquare>,
  squareSize: number,
  inset = 1.25
): HighlightEdge16[] {
  if (!affectedSquares || affectedSquares.size === 0) return [];

  const isAffected = (file: number, row: number): boolean => {
    if (file < 0 || file >= V_BOARD_SIZE || row < 0 || row >= V_BOARD_SIZE) return false;
    const sq = fileRankToVSquare(file, V_BOARD_SIZE - 1 - row);
    return sq !== null && affectedSquares.has(sq);
  };

  const edges: HighlightEdge16[] = [];

  for (let row = 0; row < V_BOARD_SIZE; row++) {
    for (let file = 0; file < V_BOARD_SIZE; file++) {
      if (!isAffected(file, row)) continue;

      const x0 = file * squareSize;
      const x1 = (file + 1) * squareSize;
      const y0 = row * squareSize;
      const y1 = (row + 1) * squareSize;
      const rank = V_BOARD_SIZE - 1 - row;

      // Top edge: no affected square above
      if (!isAffected(file, row - 1)) {
        const hasLeft = isAffected(file - 1, row);
        const hasRight = isAffected(file + 1, row);
        edges.push({
          type: 'top',
          file,
          rank,
          xStart: hasLeft ? x0 : x0 + inset,
          yStart: y0 + inset,
          xEnd: hasRight ? x1 : x1 - inset,
          yEnd: y0 + inset
        });
      }

      // Bottom edge: no affected square below
      if (!isAffected(file, row + 1)) {
        const hasLeft = isAffected(file - 1, row);
        const hasRight = isAffected(file + 1, row);
        edges.push({
          type: 'bottom',
          file,
          rank,
          xStart: hasLeft ? x0 : x0 + inset,
          yStart: y1 - inset,
          xEnd: hasRight ? x1 : x1 - inset,
          yEnd: y1 - inset
        });
      }

      // Left edge: no affected square to the left
      if (!isAffected(file - 1, row)) {
        const hasTop = isAffected(file, row - 1);
        const hasBottom = isAffected(file, row + 1);
        edges.push({
          type: 'left',
          file,
          rank,
          xStart: x0 + inset,
          yStart: hasTop ? y0 : y0 + inset,
          xEnd: x0 + inset,
          yEnd: hasBottom ? y1 : y1 - inset
        });
      }

      // Right edge: no affected square to the right
      if (!isAffected(file + 1, row)) {
        const hasTop = isAffected(file, row - 1);
        const hasBottom = isAffected(file, row + 1);
        edges.push({
          type: 'right',
          file,
          rank,
          xStart: x1 - inset,
          yStart: hasTop ? y0 : y0 + inset,
          xEnd: x1 - inset,
          yEnd: hasBottom ? y1 : y1 - inset
        });
      }
    }
  }

  return edges;
}

export function renderInfluenceHighlight16(
  ctx: CanvasRenderingContext2D,
  affectedSquares: Set<VSquare>,
  squareSize: number
) {
  const edges = computeHighlightEdges16(affectedSquares, squareSize);
  if (edges.length === 0) return;

  ctx.save();
  ctx.strokeStyle = BOARD16_COLORS.highlight;
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

export function renderBoard16(
  ctx: CanvasRenderingContext2D,
  options: Board16RenderOptions
) {
  const { width, height, field, tempoBySquare, hoverSquare, hoverValid = false } = options;
  const squareSize = width / V_BOARD_SIZE;

  ctx.clearRect(0, 0, width, height);

  // 1. Squares: uniform optical white base, then a hue wash on lit squares
  //    whose alpha fades as the tempo distance grows
  for (let row = 0; row < V_BOARD_SIZE; row++) {
    for (let file = 0; file < V_BOARD_SIZE; file++) {
      const rank = V_BOARD_SIZE - 1 - row;
      const square = fileRankToVSquare(file, rank);
      if (!square) continue;

      const x = file * squareSize;
      const y = row * squareSize;
      const state = field[square];
      const tempo = tempoBySquare[square] ?? 0;

      ctx.fillStyle = BOARD16_COLORS.square;
      ctx.fillRect(x, y, squareSize, squareSize);

      if (state?.isLit && tempo > 0) {
        ctx.fillStyle = toHslString(
          state.hue,
          state.saturation,
          state.lightness,
          TEMPO_ALPHA[tempo] ?? 1
        );
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      if (hoverSquare === square) {
        ctx.fillStyle = hoverValid ? BOARD16_COLORS.hoverValid : BOARD16_COLORS.hoverIdle;
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      // Coordinates: ranks on the left edge, files on the bottom edge
      ctx.font = '600 9px "Fira Code", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = BOARD16_COLORS.coord;

      if (file === 0) {
        ctx.fillText(String(rank + 1), x + 3, y + 11);
      }
      if (row === V_BOARD_SIZE - 1) {
        ctx.fillText(V_FILES[file], x + squareSize - 9, y + squareSize - 3);
      }
    }
  }

  // 2. Grid lines
  ctx.strokeStyle = BOARD16_COLORS.gridLine;
  ctx.lineWidth = 1;

  for (let i = 1; i < V_BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * squareSize, 0);
    ctx.lineTo(i * squareSize, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * squareSize);
    ctx.lineTo(width, i * squareSize);
    ctx.stroke();
  }

  // 3. Exterior boundary of the reachable region
  if (options.reachable.length > 0) {
    renderInfluenceHighlight16(ctx, new Set(options.reachable), squareSize);
  }

  // 4. Outer border
  ctx.strokeStyle = BOARD16_COLORS.outerBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}
