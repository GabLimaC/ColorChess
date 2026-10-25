import React from 'react';
import { GameState, InteractionMode } from '../core/types';
import { ShieldAlert, Trophy, Scale, CircleDot, MousePointerClick, Sparkles } from 'lucide-react';

interface StatusHUDProps {
  gameState: GameState;
  interactionMode?: InteractionMode;
  selectedCount?: number;
  className?: string;
}

export const StatusHUD: React.FC<StatusHUDProps> = ({
  gameState,
  interactionMode = 'play',
  selectedCount = 0,
  className = ''
}) => {
  const isWhite = gameState.turn === 'w';
  const isSelectionMode = interactionMode === 'selection';

  return (
    <div className={`flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm ${className}`}>
      {/* Turn or Selection Mode Indicator */}
      {isSelectionMode ? (
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg border bg-sky-50 border-sky-400 shadow-[0_0_10px_rgba(2,132,199,0.25)]">
            <MousePointerClick className="w-4 h-4 text-sky-600 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-sky-600 font-semibold uppercase tracking-wider">
              Selection Mode Active
            </div>
            <div className="text-sm font-semibold tracking-wide text-slate-900 flex items-center space-x-1.5">
              <span>
                {selectedCount === 0
                  ? 'Select 1 or more pieces (any side)'
                  : `${selectedCount} piece${selectedCount > 1 ? 's' : ''} selected`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <div
            className={`relative flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
              isWhite
                ? 'bg-sky-50 border-sky-400 shadow-[0_0_10px_rgba(2,132,199,0.25)]'
                : 'bg-rose-50 border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.25)]'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform duration-300 ${
                isWhite
                  ? 'bg-sky-500 shadow-[0_0_6px_#0284c7]'
                  : 'bg-rose-500 shadow-[0_0_6px_#e11d48]'
              }`}
            />
          </div>

          <div>
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Active Emission
            </div>
            <div className="text-sm font-semibold tracking-wide text-slate-900 flex items-center space-x-1.5">
              <span>{isWhite ? 'White (Ivory Core)' : 'Black (Onyx Core)'}</span>
              <span className="text-slate-500 font-normal">to move</span>
            </div>
          </div>
        </div>
      )}

      {/* Game State or Selection Status Banner */}
      <div>
        {isSelectionMode ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-300 text-sky-800 text-xs font-mono font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>{selectedCount > 0 ? 'INFLUENCE HIGHLIGHT ACTIVE' : 'AWAITING SELECTION'}</span>
          </div>
        ) : (
          <>
            {gameState.isCheckmate && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-400 text-emerald-700 text-xs font-mono font-bold animate-bounce shadow-sm">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span>CHECKMATE — {gameState.winner === 'w' ? 'WHITE WINS' : 'BLACK WINS'}</span>
              </div>
            )}

            {gameState.isCheck && !gameState.isCheckmate && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-400 text-rose-700 text-xs font-mono font-bold animate-pulse shadow-sm">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>CHECK! CRITICAL THREAT DETECTED</span>
              </div>
            )}

            {gameState.isStalemate && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-semibold">
                <Scale className="w-4 h-4 text-slate-500" />
                <span>STALEMATE — DRAW</span>
              </div>
            )}

            {gameState.isDraw && !gameState.isStalemate && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-semibold">
                <Scale className="w-4 h-4 text-slate-500" />
                <span>DRAW (REPETITION / MATERIAL)</span>
              </div>
            )}

            {!gameState.isGameOver && !gameState.isCheck && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono">
                <CircleDot className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                <span>GRID BALANCED</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
