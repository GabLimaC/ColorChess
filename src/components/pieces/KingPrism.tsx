import React from 'react';
import { PieceColor } from '../../core/types';
import { getTranslucentTheme } from './prismTheme';

interface PieceProps {
  color: PieceColor;
  className?: string;
  isCheck?: boolean;
}

export const KingPrism: React.FC<PieceProps> = ({ color, className = '' }) => {
  const theme = getTranslucentTheme(color);

  // Outer regular octagon vertices (R = 28)
  const outerOctagon = "78,50 69.8,69.8 50,78 30.2,69.8 22,50 30.2,30.2 50,22 69.8,30.2";

  // Inner concentric octagon facet (R = 16)
  const innerOctagon = "66,50 61.3,61.3 50,66 38.7,61.3 34,50 38.7,38.7 50,34 61.3,38.7";

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Regular Octagon Body */}
      <polygon
        points={outerOctagon}
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Inner Concentric Octagon Facet */}
      <polygon
        points={innerOctagon}
        fill={theme.glassInner}
        stroke={theme.strokeInner}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Central Royal Crosshair Facets */}
      <line x1="50" y1="34" x2="50" y2="66" stroke={theme.strokeInner} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="34" y1="50" x2="66" y2="50" stroke={theme.strokeInner} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};
