import React from 'react';
import { PieceType } from '../core/types';
import { OPTICAL_CONSTANTS, toHslString } from '../core/colorFormulas';
import {
  BAND_WIDTH,
  CORE_WIDTH,
  KING_FRAME_REACH,
  KNIGHT_RING_WIDTH,
  SHAPE_ALPHA,
  sideHue,
} from '../render/lightTypes';
import { Shapes } from 'lucide-react';

interface LightTypeLegendProps {
  className?: string;
}

const GLYPH_SIZE = 26;

const LEGEND_ITEMS: Array<{ type: PieceType; label: string }> = [
  { type: 'p', label: 'Pawn · square tint' },
  { type: 'r', label: 'Rook · axis band' },
  { type: 'b', label: 'Bishop · diagonal band' },
  { type: 'q', label: 'Queen · band + core' },
  { type: 'n', label: 'Knight · jump-ring arch' },
  { type: 'k', label: 'King · thick square frame' },
];

const legendColor = (hue: number): string =>
  toHslString(
    hue,
    OPTICAL_CONSTANTS.softPart2Sat,
    OPTICAL_CONSTANTS.softPart2Lightness,
    SHAPE_ALPHA
  );

const Glyph: React.FC<{ type: PieceType }> = ({ type }) => {
  const size = GLYPH_SIZE;
  const center = size / 2;
  const hue = sideHue('w');

  const band = (angle: number, width: number, key: string) => {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    return (
      <line
        key={key}
        x1={center - dx * size}
        y1={center - dy * size}
        x2={center + dx * size}
        y2={center + dy * size}
        stroke={legendColor(hue)}
        strokeWidth={width * size}
        strokeLinecap="butt"
      />
    );
  };

  let shape: React.ReactNode = null;

  switch (type) {
    case 'p':
      shape = (
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill={legendColor(hue)}
        />
      );
      break;
    case 'r':
      shape = band(0, BAND_WIDTH, 'rook-band');
      break;
    case 'b':
      shape = band(-Math.PI / 4, BAND_WIDTH, 'bishop-band');
      break;
    case 'q':
      shape = (
        <>
          {band(0, BAND_WIDTH, 'queen-band')}
          {band(0, CORE_WIDTH, 'queen-core')}
        </>
      );
      break;
    case 'n':
      shape = (
        <path
          d="M 5 20 A 19 19 0 0 1 21 6"
          fill="none"
          stroke={legendColor(hue)}
          strokeWidth={KNIGHT_RING_WIDTH * size}
          strokeLinecap="round"
        />
      );
      break;
    case 'k': {
      const strokeWidth = KING_FRAME_REACH * size * 0.42;
      const half = strokeWidth / 2;
      shape = (
        <rect
          x={half}
          y={half}
          width={size - strokeWidth}
          height={size - strokeWidth}
          fill="none"
          stroke={legendColor(hue)}
          strokeWidth={strokeWidth}
        />
      );
      break;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 rounded border border-slate-300 bg-white overflow-hidden"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
};

export const LightTypeLegend: React.FC<LightTypeLegendProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5 ${className}`}>
      <div className="flex items-center space-x-2">
        <Shapes className="w-4 h-4 text-sky-600" />
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
          Light Type Vocabulary
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {LEGEND_ITEMS.map(item => (
          <div key={item.type} className="flex items-center space-x-2">
            <Glyph type={item.type} />
            <span className="text-[11px] font-mono text-slate-600 leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span className="flex items-center space-x-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: legendColor(sideHue('w')) }}
          />
          <span>White</span>
        </span>
        <span className="flex items-center space-x-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: legendColor(sideHue('b')) }}
          />
          <span>Black</span>
        </span>
        <span className="flex items-center space-x-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: legendColor(OPTICAL_CONSTANTS.greenStandoffHue) }}
          />
          <span>Contested ratio</span>
        </span>
      </div>
    </div>
  );
};
