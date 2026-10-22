import React from 'react';
import { Square, SquareOpticalState } from '../core/types';
import { toHslString, OPTICAL_CONSTANTS } from '../core/colorFormulas';
import { squareToColRow } from './PieceOverlay';

interface SquareInspectorProps {
  square: Square | null;
  state?: SquareOpticalState | null;
  flipped: boolean;
  className?: string;
}

export function getTacticalInterpretation(b: number, r: number, hue: number): {
  label: string;
  badgeClass: string;
} {
  if (b <= 0.001 && r <= 0.001) {
    return {
      label: 'Unlit (Neutral Ground)',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }
  if (r <= 0.001 && b > 0.001) {
    return {
      label: 'White Dominated',
      badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
    };
  }
  if (b <= 0.001 && r > 0.001) {
    return {
      label: 'Black Dominated',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    };
  }
  if (Math.abs(b - r) < 0.001 || Math.abs(hue - OPTICAL_CONSTANTS.greenStandoffHue) < 0.5) {
    return {
      label: 'Equilibrium Standoff (1:1)',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    };
  }
  if (hue < 120) {
    return {
      label: 'Black Advantage (Contested)',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    };
  }
  return {
    label: 'White Advantage (Contested)',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
  };
}

export const SquareInspector: React.FC<SquareInspectorProps> = ({
  square,
  state,
  flipped,
  className = '',
}) => {
  if (!square || !state) return null;

  const { col, row } = squareToColRow(square, flipped);
  const isTopHalf = row < 4;
  const isLeftHalf = col < 4;

  const totalB = state.totalBlue;
  const totalR = state.totalRed;
  const isLit = state.isLit;
  const hue = state.hue;
  const interpretation = getTacticalInterpretation(totalB, totalR, hue);

  const swatchColor = isLit
    ? toHslString(hue, 85, 52)
    : '#64748b';

  return (
    <div
      style={{
        position: 'absolute',
        top: isTopHalf ? `${(row + 1.1) * 12.5}%` : undefined,
        bottom: !isTopHalf ? `${(8 - row + 0.1) * 12.5}%` : undefined,
        left: isLeftHalf ? `${Math.max(1, col * 12.5)}%` : undefined,
        right: !isLeftHalf ? `${Math.max(1, (7 - col) * 12.5)}%` : undefined,
      }}
      className={`pointer-events-none z-30 transition-all duration-100 ease-out min-w-[210px] max-w-[250px] bg-slate-900/95 text-slate-100 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl p-3 font-mono space-y-2 select-none ${className}`}
    >
      {/* Header: Coordinates & Tactical Interpretation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-white tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            {square.toUpperCase()}
          </span>
          <div
            style={{ backgroundColor: swatchColor }}
            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            title={`Hue: ${isLit ? `${hue}°` : 'Unlit'}`}
          />
        </div>
        <span className="text-[10px] text-slate-400">
          {isLit ? `H: ${hue.toFixed(1)}°` : 'Unlit'}
        </span>
      </div>

      {/* Tactical interpretation pill */}
      <div
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border text-center ${interpretation.badgeClass}`}
      >
        {interpretation.label}
      </div>

      {/* Flux telemetry readout */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
        {/* White Flux */}
        <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 space-y-1">
          <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center justify-between">
            <span>White Flux</span>
            <span className="text-white font-bold">{totalB}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Direct Attackers</span>
            <span className="text-slate-200">{state.primaryBlue}</span>
          </div>
        </div>

        {/* Black Flux */}
        <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 space-y-1">
          <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center justify-between">
            <span>Black Flux</span>
            <span className="text-white font-bold">{totalR}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Direct Attackers</span>
            <span className="text-slate-200">{state.primaryRed}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
