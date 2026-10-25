import React, { useCallback, useMemo, useState } from 'react';
import { PieceColor, PieceType } from '../core/types';
import { MovementBoard } from './MovementBoard';
import { PiecePalette } from './PiecePalette';
import { buildInfluenceField } from './movementEngine';
import { TempoDistance, VSquare, VisualPiece } from './types';
import { RotateCcw, Sparkles } from 'lucide-react';

const SPAWN_SQUARE: VSquare = 'i8';

export const MovementVisualizerPage: React.FC = () => {
  const [piece, setPiece] = useState<VisualPiece>({
    id: 'visual-piece',
    type: 'q',
    color: 'w',
    square: SPAWN_SQUARE
  });

  const [tempo, setTempo] = useState<TempoDistance>(1);

  const influence = useMemo(() => buildInfluenceField(piece, tempo), [piece, tempo]);

  const handleSelect = useCallback((type: PieceType, color: PieceColor) => {
    setPiece(prev => ({ ...prev, type, color, square: SPAWN_SQUARE }));
  }, []);

  const handleMove = useCallback((square: VSquare) => {
    setPiece(prev => ({ ...prev, square }));
  }, []);

  const handleReset = useCallback(() => {
    setPiece(prev => ({ ...prev, square: SPAWN_SQUARE }));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Board */}
      <div className="lg:col-span-8 xl:col-span-9">
        <div className="p-2 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-md">
          <div className="max-w-[860px] mx-auto">
            <MovementBoard
              piece={piece}
              field={influence.field}
              reachable={influence.reachable}
              tempoBySquare={influence.tempoBySquare}
              onMove={handleMove}
            />
          </div>
        </div>
      </div>

      {/* Controls & Readout */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-4">
        <PiecePalette piece={piece} onSelect={handleSelect} />

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Movement Field
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {([1, 2, 3] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTempo(t)}
                  aria-label={`Show squares reachable within ${t} tempo${t > 1 ? 's' : ''}`}
                  title={`Within ${t} tempo${t > 1 ? 's' : ''}`}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
                    tempo === t ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-mono text-[10px] transition-colors shadow-sm"
              title={`Re-spawn the piece on ${SPAWN_SQUARE}`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Square
              </div>
              <div className="text-sm font-mono font-bold text-slate-900 uppercase">
                {piece.square}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Reachable
              </div>
              <div className="text-sm font-mono font-bold text-slate-900">
                {influence.reachable.length}
              </div>
            </div>
          </div>

          <div className="text-[11px] leading-relaxed text-slate-600 font-mono">
            <div className="flex items-center space-x-1.5 text-slate-800 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>16 × 16 Field</span>
            </div>
            <p>
              White pieces cast <span className="text-sky-700 font-semibold">blue</span> influence,
              Black cast <span className="text-rose-700 font-semibold">red</span> influence.
              Rook, Bishop and Queen range is capped at 8 steps.
            </p>
            <p className="mt-1.5 text-slate-500">
              Tempo N chains N successive moves: the wash fades with distance
              (T1 solid, T2 ≈ 55%, T3 ≈ 28%). The black outline and the
              <span className="font-mono"> Reachable </span>
              count describe the 1-tempo field.
            </p>
            <p className="mt-1.5 text-slate-500">
              Drag the piece onto a lit square to move it; invalid drops snap back.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
