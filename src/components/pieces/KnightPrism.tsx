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

export const KnightPrism: React.FC<PieceProps> = ({ color, className = '', paint }) => {
  const theme = getTranslucentTheme(color, paint);

  const outerPoints = `
    50,27
    62,25
    65,35
    75,38
    73,50
    75,62
    65,65
    62,75
    50,73
    38,75
    35,65
    25,62
    27,50
    25,38
    35,35
    38,25
  `.trim().replace(/\s+/g, ' ');

  const innerPoints = `
    50,35
    58,34
    60,40
    66,42
    65,50
    66,58
    60,60
    58,66
    50,65
    42,66
    40,60
    34,58
    35,50
    34,42
    40,40
    42,34
  `.trim().replace(/\s+/g, ' ');

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Subtly Non-Convex Translucent Glass Body */}
      <polygon
        points={outerPoints}
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Inner Concentric Optical Facet Core */}
      <polygon
        points={innerPoints}
        fill={theme.glassInner}
        stroke={theme.strokeInner}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Central Light Entrance Aperture */}
      <circle
        cx="50"
        cy="50"
        r="4.8"
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="1.3"
      />
    </svg>
  );
};
