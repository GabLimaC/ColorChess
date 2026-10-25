import { PieceColor, PieceType, Ray, Square, SquareOpticalState } from '../core/types';
import { OPTICAL_CONSTANTS, calculateHue, toHslString } from '../core/colorFormulas';
import {
  LightShapeSpec,
  PIECE_DRAW_ORDER,
  SHAPE_ALPHA,
  frameRect,
  screenDirection,
  sideHue,
  specsForPiece,
} from './lightTypes';

export interface SquareGeometry {
  x: number;
  y: number;
  size: number;
}

function shapeColor(hue: number, alpha: number): string {
  return toHslString(
    hue,
    OPTICAL_CONSTANTS.softPart2Sat,
    OPTICAL_CONSTANTS.softPart2Lightness,
    alpha
  );
}

function clipToSquare(ctx: CanvasRenderingContext2D, geometry: SquareGeometry): void {
  const { x, y, size } = geometry;
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else {
    r = x;
    b = c;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function drawFill(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  color: string
): void {
  const { x, y, size } = geometry;

  ctx.save();
  clipToSquare(ctx, geometry);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.restore();
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  spec: Extract<LightShapeSpec, { kind: 'band' }>,
  color: string,
  includeCore: boolean,
  endFraction?: number
): void {
  const { x, y, size } = geometry;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const ax = Math.cos(spec.angle);
  const ay = Math.sin(spec.angle);
  const reach = size;

  const traceLine = (lineWidth: number): void => {
    ctx.beginPath();
    ctx.moveTo(cx - ax * reach, cy - ay * reach);
    // endFraction < 1 shortens the far end of the beam (e.g. a blocked ray
    // stops at the blocker instead of crossing the whole square)
    ctx.lineTo(cx + ax * reach * (endFraction ?? 1), cy + ay * reach * (endFraction ?? 1));
    ctx.lineWidth = lineWidth;
  };

  ctx.save();
  clipToSquare(ctx, geometry);
  ctx.lineCap = 'butt';

  traceLine(spec.width * size);
  ctx.strokeStyle = color;
  ctx.stroke();

  if (includeCore && spec.coreWidth !== undefined) {
    traceLine(spec.coreWidth * size);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.restore();
}

function drawDisc(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  spec: Extract<LightShapeSpec, { kind: 'disc' }>,
  color: string
): void {
  const { x, y, size } = geometry;
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.save();
  clipToSquare(ctx, geometry);
  ctx.beginPath();
  ctx.arc(cx, cy, spec.radius * size, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  spec: Extract<LightShapeSpec, { kind: 'ring' }>,
  color: string
): void {
  const { x, y, size } = geometry;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const ringCx = cx - spec.dx * size;
  const ringCy = cy - spec.dy * size;
  const radius = Math.hypot(spec.dx, spec.dy) * size;

  ctx.save();
  clipToSquare(ctx, geometry);
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = spec.width * size;
  ctx.stroke();
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  spec: Extract<LightShapeSpec, { kind: 'frame' }>,
  color: string
): void {
  const { x, y, size } = geometry;
  const rect = frameRect(spec.dx, spec.dy, spec.reach);

  ctx.save();
  clipToSquare(ctx, geometry);
  ctx.fillStyle = color;
  ctx.fillRect(
    x + rect.x * size,
    y + rect.y * size,
    rect.w * size,
    rect.h * size
  );
  ctx.restore();
}

function drawSpec(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  spec: LightShapeSpec,
  color: string,
  includeCore: boolean,
  endFraction?: number
): void {
  switch (spec.kind) {
    case 'fill':
      drawFill(ctx, geometry, color);
      break;
    case 'band':
      drawBand(ctx, geometry, spec, color, includeCore, endFraction);
      break;
    case 'disc':
      drawDisc(ctx, geometry, spec, color);
      break;
    case 'ring':
      drawRing(ctx, geometry, spec, color);
      break;
    case 'frame':
      drawFrame(ctx, geometry, spec, color);
      break;
  }
}

/** Terminal (blocked/edge) beams span 80% of the square instead of the full width. */
const BLOCKED_BEAM_END_FRACTION = 0.3;

/** Rays that terminate (blocked by a piece or the board edge) stop partway. */
function endFractionForRay(ray: Ray, square: Square): number | undefined {
  return ray.blocked && ray.to === square ? BLOCKED_BEAM_END_FRACTION : undefined;
}

function drawRayShapes(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  ray: Ray,
  flipped: boolean,
  alpha: number,
  endFraction?: number
): void {
  const hue = sideHue(ray.sourcePiece.color);
  const dir = screenDirection(ray.direction, flipped);
  for (const spec of specsForPiece(ray.sourcePiece.type, dir)) {
    drawSpec(ctx, geometry, spec, shapeColor(hue, alpha), true, endFraction);
  }
}

const TRACE_COLOR = 'rgba(1, 1, 1, 1)';

function traceRayShapes(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  ray: Ray,
  flipped: boolean,
  endFraction?: number
): void {
  const dir = screenDirection(ray.direction, flipped);
  for (const spec of specsForPiece(ray.sourcePiece.type, dir)) {
    drawSpec(ctx, geometry, spec, TRACE_COLOR, false, endFraction);
  }
}

function drawContestedSquare(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  blueRays: Ray[],
  redRays: Ray[],
  flipped: boolean,
  alpha: number,
  square: Square
): void {
  const { x, y, size } = geometry;
  const dpr = Math.max(1, ctx.getTransform().a || 1);
  const pixelSize = Math.max(1, Math.round(size * dpr));
  const localGeometry: SquareGeometry = { x: 0, y: 0, size };

  const blueCanvas = document.createElement('canvas');
  blueCanvas.width = pixelSize;
  blueCanvas.height = pixelSize;
  const blueCtx = blueCanvas.getContext('2d');
  const redCanvas = document.createElement('canvas');
  redCanvas.width = pixelSize;
  redCanvas.height = pixelSize;
  const redCtx = redCanvas.getContext('2d');
  if (!blueCtx || !redCtx) return;

  blueCtx.scale(dpr, dpr);
  redCtx.scale(dpr, dpr);

  blueCtx.globalCompositeOperation = 'lighter';
  for (const ray of blueRays) {
    traceRayShapes(blueCtx, localGeometry, ray, flipped, endFractionForRay(ray, square));
  }
  blueCtx.globalCompositeOperation = 'source-over';

  redCtx.globalCompositeOperation = 'lighter';
  for (const ray of redRays) {
    traceRayShapes(redCtx, localGeometry, ray, flipped, endFractionForRay(ray, square));
  }
  redCtx.globalCompositeOperation = 'source-over';

  const blueData = blueCtx.getImageData(0, 0, pixelSize, pixelSize).data;
  const redData = redCtx.getImageData(0, 0, pixelSize, pixelSize).data;

  const out = document.createElement('canvas');
  out.width = pixelSize;
  out.height = pixelSize;
  const octx = out.getContext('2d');
  if (!octx) return;

  const outData = octx.createImageData(pixelSize, pixelSize);
  const outPixels = outData.data;

  for (let i = 0; i < pixelSize * pixelSize; i++) {
    const blueCount = blueData[i * 4];
    const redCount = redData[i * 4];
    if (blueCount + redCount <= 0) continue;

    const [r, g, b] = hslToRgb(
      calculateHue(blueCount, redCount),
      OPTICAL_CONSTANTS.softPart2Sat,
      OPTICAL_CONSTANTS.softPart2Lightness
    );
    outPixels[i * 4] = r;
    outPixels[i * 4 + 1] = g;
    outPixels[i * 4 + 2] = b;
    outPixels[i * 4 + 3] = Math.round(255 * alpha);
  }

  octx.putImageData(outData, 0, 0);
  ctx.drawImage(out, x, y, size, size);
}

export function paintSquareLightTypes(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  rays: Ray[] | null | undefined,
  state: SquareOpticalState | null | undefined,
  flipped: boolean,
  alpha: number = SHAPE_ALPHA
): void {
  if (!state || !state.isLit) return;

  const ordered = [...(rays ?? [])].sort(
    (a, b) => PIECE_DRAW_ORDER[a.sourcePiece.type] - PIECE_DRAW_ORDER[b.sourcePiece.type]
  );

  if (state.totalBlue > 0 && state.totalRed > 0) {
    const blueRays = ordered.filter(ray => ray.sourcePiece.color === 'w');
    const redRays = ordered.filter(ray => ray.sourcePiece.color === 'b');
    if (blueRays.length > 0 && redRays.length > 0) {
      drawContestedSquare(ctx, geometry, blueRays, redRays, flipped, alpha, state.square);
      return;
    }
  }

  for (const ray of ordered) {
    drawRayShapes(ctx, geometry, ray, flipped, alpha, endFractionForRay(ray, state.square));
  }
}

/**
 * Paints the selected piece's light-type pattern on an influenced square,
 * oriented along the board-space direction from the influence root.
 */
export function paintInfluenceShape(
  ctx: CanvasRenderingContext2D,
  geometry: SquareGeometry,
  type: PieceType,
  color: PieceColor,
  direction: [number, number],
  flipped: boolean,
  alpha: number
): void {
  const dir = screenDirection(direction, flipped);
  const hue = sideHue(color);
  for (const spec of specsForPiece(type, dir)) {
    drawSpec(ctx, geometry, spec, shapeColor(hue, alpha), true);
  }
}
