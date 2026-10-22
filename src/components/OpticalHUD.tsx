import React from 'react';
import { OpticalField } from '../core/types';
import { Activity, Eye, EyeOff } from 'lucide-react';

interface OpticalHUDProps {
  opticalField: OpticalField;
  halfMoves: number;
  fullMoves: number;
  showBeams: boolean;
  onToggleBeams: () => void;
  className?: string;
}

export const OpticalHUD: React.FC<OpticalHUDProps> = ({
  opticalField,
  halfMoves,
  fullMoves,
  showBeams,
  onToggleBeams,
  className = ''
}) => {
  const totalFlux = opticalField.totalBlueFlux + opticalField.totalRedFlux;
  const bluePercent = totalFlux > 0 ? (opticalField.totalBlueFlux / totalFlux) * 100 : 50;
  const redPercent = totalFlux > 0 ? (opticalField.totalRedFlux / totalFlux) * 100 : 50;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-800">
            Field Flux Balance
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
          <span>Move {fullMoves} (half-ply {halfMoves})</span>
          <span>•</span>
          <span>{opticalField.rays.length} Active Rays</span>
        </div>
      </div>

      {/* Dual Flux Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-300">
          <div
            style={{ width: `${bluePercent}%` }}
            className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-300"
          />
          <div
            style={{ width: `${redPercent}%` }}
            className="h-full bg-gradient-to-l from-rose-400 to-rose-600 transition-all duration-300"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-sky-700 flex items-center space-x-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block" />
            <span>Blue: {opticalField.totalBlueFlux.toFixed(1)} ({bluePercent.toFixed(0)}%)</span>
          </span>
          <span className="text-rose-700 flex items-center space-x-1 font-medium">
            <span>Red: {opticalField.totalRedFlux.toFixed(1)} ({redPercent.toFixed(0)}%)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
          </span>
        </div>
      </div>

      {/* Optical Ray Beams Toggle */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
          {showBeams ? (
            <Eye className="w-3.5 h-3.5 text-sky-600" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>Ray Beams Layer</span>
        </div>
        <button
          onClick={onToggleBeams}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
            showBeams
              ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs'
              : 'bg-slate-100 border-slate-300 text-slate-500'
          }`}
          title="Toggle primary laser and X-ray guide beams"
        >
          <span className={`w-2 h-2 rounded-full ${showBeams ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{showBeams ? 'BEAMS ON' : 'BEAMS OFF'}</span>
        </button>
      </div>
    </div>
  );
};
