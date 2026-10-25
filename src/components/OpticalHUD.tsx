import React from 'react';
import { OpticalField, PieceType, LightColorFilter } from '../core/types';
import { Activity, Eye, EyeOff, Lightbulb } from 'lucide-react';

interface OpticalHUDProps {
  opticalField: OpticalField;
  halfMoves: number;
  fullMoves: number;
  showBeams: boolean;
  onToggleBeams: () => void;
  lightOpacity?: number;
  onChangeLightOpacity?: (value: number) => void;
  emissionTypes?: Set<PieceType>;
  onToggleEmissionType?: (type: PieceType) => void;
  onEnableAllEmission?: () => void;
  onDisableAllEmission?: () => void;
  lightColorFilter?: LightColorFilter;
  onChangeLightColorFilter?: (filter: LightColorFilter) => void;
  className?: string;
}

const EMISSION_ORDER: PieceType[] = ['p', 'r', 'b', 'q', 'n', 'k'];
const EMISSION_LABELS: Record<PieceType, string> = {
  p: 'Pawn',
  r: 'Rook',
  b: 'Bishop',
  q: 'Queen',
  n: 'Knight',
  k: 'King',
};

const COLOR_FILTERS: {
  value: LightColorFilter;
  label: string;
  title: string;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: 'all',
    label: 'ALL',
    title: 'Show both blue and red light',
    activeClass: 'bg-slate-900 border-slate-900 text-white shadow-xs',
    dotClass: 'bg-slate-200',
  },
  {
    value: 'blue',
    label: 'BLUE',
    title: 'Show only blue light (white pieces)',
    activeClass: 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs',
    dotClass: 'bg-sky-500',
  },
  {
    value: 'red',
    label: 'RED',
    title: 'Show only red light (black pieces)',
    activeClass: 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs',
    dotClass: 'bg-rose-500',
  },
  {
    value: 'disputed',
    label: 'DISPUTED',
    title: 'Show only squares claimed by both blue and red light',
    activeClass: 'bg-violet-50 border-violet-300 text-violet-800 shadow-xs',
    dotClass: 'bg-violet-500',
  },
];

export const OpticalHUD: React.FC<OpticalHUDProps> = ({
  opticalField,
  halfMoves,
  fullMoves,
  showBeams,
  onToggleBeams,
  lightOpacity,
  onChangeLightOpacity,
  emissionTypes,
  onToggleEmissionType,
  onEnableAllEmission,
  onDisableAllEmission,
  lightColorFilter = 'all',
  onChangeLightColorFilter,
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

      {/* Light Color Channel Filter */}
      {onChangeLightColorFilter && (
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-rose-500 inline-block" />
              <span>Light Channel</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {lightColorFilter === 'all'
                ? 'Both channels'
                : lightColorFilter === 'blue'
                  ? 'Blue only'
                  : lightColorFilter === 'red'
                    ? 'Red only'
                    : 'Disputed only'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {COLOR_FILTERS.map(filter => {
              const active = lightColorFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => onChangeLightColorFilter(filter.value)}
                  title={filter.title}
                  className={`flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg border text-[10px] font-mono font-semibold uppercase transition-all ${
                    active
                      ? filter.activeClass
                      : 'bg-slate-100 border-slate-300 text-slate-400 opacity-70'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? filter.dotClass : 'bg-slate-400'
                    }`}
                  />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-mono leading-relaxed text-slate-500">
            View only blue light from white pieces, only red light from black
            pieces, the combined field, or only the disputed squares claimed by
            both.
          </p>
        </div>
      )}

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
          title="Toggle laser guide beams from the selected piece"
        >
          <span className={`w-2 h-2 rounded-full ${showBeams ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{showBeams ? 'BEAMS ON' : 'BEAMS OFF'}</span>
        </button>
      </div>

      {/* Light Emission Intensity Slider */}
      {typeof lightOpacity === 'number' && onChangeLightOpacity && (
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
              <Lightbulb className="w-3.5 h-3.5 text-sky-600" />
              <span>Light Emission Opacity</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {Math.round(lightOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(lightOpacity * 100)}
            onChange={e => onChangeLightOpacity(Number(e.target.value) / 100)}
            className="w-full accent-sky-600"
            title="Adjust how solid the piece light shapes appear"
          />
        </div>
      )}

      {/* Light Emission Sources: per-piece-type visibility toggles */}
      {emissionTypes && onToggleEmissionType && (
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
              <Lightbulb className="w-3.5 h-3.5 text-sky-600" />
              <span>Light Emission Sources</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {onEnableAllEmission && (
                <button
                  onClick={onEnableAllEmission}
                  className="px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold transition-colors bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100"
                  title="All types emit light; press again to restore your previous selection"
                >
                  ALL ON
                </button>
              )}
              {onDisableAllEmission && (
                <button
                  onClick={onDisableAllEmission}
                  className="px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold transition-colors bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                  title="No types emit light; press again to restore your previous selection"
                >
                  ALL OFF
                </button>
              )}
              <span className="text-[10px] font-mono text-slate-400">
                {emissionTypes.size}/{EMISSION_ORDER.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {EMISSION_ORDER.map(type => {
              const on = emissionTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => onToggleEmissionType(type)}
                  title={`${on ? 'Hide' : 'Show'} ${EMISSION_LABELS[type]} light emission`}
                  className={`flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg border text-[10px] font-mono font-semibold uppercase transition-all ${
                    on
                      ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs'
                      : 'bg-slate-100 border-slate-300 text-slate-400 opacity-70'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      on ? 'bg-sky-500' : 'bg-slate-400'
                    }`}
                  />
                  <span>{EMISSION_LABELS[type]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-mono leading-relaxed text-slate-500">
            Toggle which piece types cast light on the board. Piece sprites stay
            visible; only their emission is hidden.
          </p>
        </div>
      )}
    </div>
  );
};
