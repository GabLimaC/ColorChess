import { PieceColor } from '../../core/types';

export interface TranslucentPrismTheme {
  isWhite: boolean;
  glassFill: string;
  glassInner: string;
  stroke: string;
  strokeInner: string;
}

export function getTranslucentTheme(color: PieceColor): TranslucentPrismTheme {
  const isWhite = color === 'w';

  if (isWhite) {
    return {
      isWhite: true,
      glassFill: '#2563eb',    // Solid, vivid royal cobalt blue
      glassInner: '#60a5fa',   // Bright sky blue core facet
      stroke: '#000000',       // Bold black border
      strokeInner: '#bfdbfe'   // Crisp light facet line
    };
  }

  return {
    isWhite: false,
    glassFill: '#e11d48',    // Solid, vivid ruby crimson red
    glassInner: '#fb7185',   // Bright rose red core facet
    stroke: '#000000',       // Bold black border
    strokeInner: '#fecdd3'   // Crisp light facet line
  };
}
