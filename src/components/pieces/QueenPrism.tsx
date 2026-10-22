import React from 'react';
import { PieceColor } from '../../core/types';
import { getTranslucentTheme } from './prismTheme';

interface PieceProps {
  color: PieceColor;
  className?: string;
  isCheck?: boolean;
}

export const QueenPrism: React.FC<PieceProps> = ({ color, className = '' }) => {
  const theme = getTranslucentTheme(color);

  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const rOuter = 36;
  const rInner = 20;

  const starPoints = angles.map((deg) => {
    const radOuter = (deg * Math.PI) / 180;
    const radInner = ((deg + 22.5) * Math.PI) / 180;

    const xOuter = (50 + Math.cos(radOuter) * rOuter).toFixed(1);
    const yOuter = (50 + Math.sin(radOuter) * rOuter).toFixed(1);
    const xInner = (50 + Math.cos(radInner) * rInner).toFixed(1);
    const yInner = (50 + Math.sin(radInner) * rInner).toFixed(1);

    return `${xOuter},${yOuter} ${xInner},${yInner}`;
  }).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 2D 8-Pointed Starburst Glass Body */}
      <polygon
        points={starPoints}
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Inner Optical Core Octagon */}
      <polygon
        points={angles.map(deg => {
          const rad = ((deg + 22.5) * Math.PI) / 180;
          return `${(50 + Math.cos(rad) * 15).toFixed(1)},${(50 + Math.sin(rad) * 15).toFixed(1)}`;
        }).join(' ')}
        fill={theme.glassInner}
        stroke={theme.strokeInner}
        strokeWidth="1.2"
      />

      {/* Central Entrance Aperture */}
      <circle
        cx="50"
        cy="50"
        r="5.5"
        fill={theme.glassFill}
        stroke={theme.stroke}
        strokeWidth="1.4"
      />
    </svg>
  );
};
