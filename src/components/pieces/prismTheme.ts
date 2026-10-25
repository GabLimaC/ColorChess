import { PieceColor } from '../../core/types';
import { PiecePaint, mixHex, paintTintHex } from '../../core/paintEngine';

export interface TranslucentPrismTheme {
  isWhite: boolean;
  glassFill: string;
  glassInner: string;
  stroke: string;
  strokeInner: string;
}

interface BaseTheme {
  glassFill: string;
  glassInner: string;
  stroke: string;
  strokeInner: string;
}

const WHITE_BASE: BaseTheme = {
  glassFill: '#ffffff',    // Pure white body
  glassInner: '#e2e8f0',   // Soft grey core facet
  stroke: '#000000',       // Bold black border
  strokeInner: '#64748b'   // Crisp slate facet line
};

const BLACK_BASE: BaseTheme = {
  glassFill: '#000000',    // Pure black body
  glassInner: '#374151',   // Dark grey core facet
  stroke: '#000000',       // Bold black border
  strokeInner: '#9ca3af'   // Crisp light facet line
};

export function getTranslucentTheme(
  color: PieceColor,
  paint?: PiecePaint | null
): TranslucentPrismTheme {
  const isWhite = color === 'w';
  const base = isWhite ? WHITE_BASE : BLACK_BASE;

  if (!paint || paint.strength <= 0) {
    return { isWhite, ...base };
  }

  const tint = paintTintHex(paint.hue, color);

  return {
    isWhite,
    glassFill: mixHex(base.glassFill, tint, paint.strength),
    glassInner: mixHex(base.glassInner, tint, paint.strength),
    stroke: base.stroke,
    strokeInner: base.strokeInner
  };
}
