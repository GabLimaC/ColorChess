import { Ray, Square } from '../core/types';

export interface BeamRenderOptions {
  width: number;
  height: number;
  flipped: boolean;
  showBeams?: boolean;
  selectedSquare?: Square | null;
}

export const BEAM_COLORS = {
  whiteLaser: 'rgba(2, 132, 199, 0.95)',   // Bold Electric Cyan/Blue
  blackLaser: 'rgba(225, 29, 72, 0.95)',   // Bold Electric Ruby/Red
  outline: '#000000',                      // Crisp black border
};

/**
 * Converts a board square ('a1'..'h8') to canvas pixel center coordinates.
 */
export function squareToCenter(
  square: Square,
  squareSize: number,
  flipped: boolean
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;

  const col = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;

  return {
    x: (col + 0.5) * squareSize,
    y: (row + 0.5) * squareSize,
  };
}

/**
 * Renders optical ray beams onto the canvas.
 * Beams only appear when a piece is actively selected, and are outlined with a black border.
 */
export function renderBeamsToCanvas(
  ctx: CanvasRenderingContext2D,
  rays: Ray[],
  options: BeamRenderOptions
) {
  const { width, flipped, showBeams = true, selectedSquare } = options;

  // Only render beams when a piece is actively selected
  if (!showBeams || !selectedSquare || !rays || rays.length === 0) return;

  const selectedRays = rays.filter(
    ray => ray.sourcePiece.square === selectedSquare
  );
  if (selectedRays.length === 0) return;

  const squareSize = width / 8;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  // Pre-calculate line endpoints
  const lines = selectedRays.map(ray => ({
    start: squareToCenter(ray.from, squareSize, flipped),
    end: squareToCenter(ray.to, squareSize, flipped),
    color: ray.sourcePiece.color === 'w' ? BEAM_COLORS.whiteLaser : BEAM_COLORS.blackLaser,
  }));

  // 1. Draw outer black border for all selected beams
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = BEAM_COLORS.outline;
  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();
  }

  // 2. Draw inner colored laser core on top
  ctx.lineWidth = 2.2;
  for (const line of lines) {
    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();
  }

  ctx.restore();
}
