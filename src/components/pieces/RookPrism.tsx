import React from 'react';
import { PieceColor } from '../../core/types';
import { getTranslucentTheme } from './prismTheme';
import { PiecePaint } from '../../core/paintEngine';

interface PieceProps {
  color: PieceColor;
  className?: string;
  isCheck?: boolean;
  paint?: PiecePaint | null;
}

export const RookPrism: React.FC<PieceProps> = ({ color, className = '', paint }) => {
  const theme = getTranslucentTheme(color, paint);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 2D Orthogonal Cruciform Glass Body (+) */}
      <path
        d="
          M 41,20 L 59,20 L 59,41 L 80,41 L 80,59 L 59,59 L 59,80 L 41,80 L 41,59 L 20,59 L 20,41 L 41,41 Z
        "
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Internal Center Core Facet Square */}
      <rect
        x="41"
        y="41"
        width="18"
        height="18"
        fill={theme.glassInner}
        stroke={theme.strokeInner}
        strokeWidth="1.2"
      />

      {/* Central Entrance Aperture */}
      <circle
        cx="50"
        cy="50"
        r="4.5"
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="1.2"
      />
    </svg>
  );
};
