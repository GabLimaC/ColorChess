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

export const BishopPrism: React.FC<PieceProps> = ({ color, className = '', paint }) => {
  const theme = getTranslucentTheme(color, paint);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(45 50 50)">
        {/* 2D Diagonal Cruciform Glass Body (X) */}
        <path
          d="
            M 42,21 L 58,21 L 58,42 L 79,42 L 79,58 L 58,58 L 58,79 L 42,79 L 42,58 L 21,58 L 21,42 L 42,42 Z
          "
          fill={theme.glassFill}
          stroke={theme.stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Central Core Diamond Facet */}
        <rect
          x="42"
          y="42"
          width="16"
          height="16"
          fill={theme.glassInner}
          stroke={theme.strokeInner}
          strokeWidth="1.2"
        />

        {/* Optical Cleft Slit */}
        <line
          x1="38"
          y1="50"
          x2="62"
          y2="50"
          stroke={theme.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
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
      </g>
    </svg>
  );
};
