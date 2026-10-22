import React from 'react';
import { PieceColor } from '../../core/types';
import { getTranslucentTheme } from './prismTheme';

interface PieceProps {
  color: PieceColor;
  className?: string;
  isCheck?: boolean;
}

export const PawnPrism: React.FC<PieceProps> = ({ color, className = '' }) => {
  const theme = getTranslucentTheme(color);
  const isWhite = color === 'w';
  const transform = isWhite ? '' : 'rotate(180 50 50)';

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={transform}>
        {/* Solid Chunky V-Shaped Glass Body */}
        <polygon
          points="34,38 50,54 66,38 66,52 50,68 34,52"
          fill={theme.glassFill}
          stroke={theme.stroke}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Inner Glass Facet Layer */}
        <polygon
          points="38,43 50,55 62,43 62,49 50,61 38,49"
          fill={theme.glassInner}
          stroke={theme.strokeInner}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
