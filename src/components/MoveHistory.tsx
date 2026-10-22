import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../core/types';

interface MoveHistoryProps {
  history: MoveRecord[];
  className?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Group moves into pairs (White & Black)
  const movePairs: { number: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1]
    });
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-full shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700">
          Transmission Log
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          {history.length} {history.length === 1 ? 'ply' : 'plies'}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs max-h-56 scrollbar-thin scrollbar-thumb-slate-300"
      >
        {movePairs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 italic">
            Optical grid awaiting first move
          </div>
        ) : (
          movePairs.map(pair => {
            const isLatestWhite = pair.white && history[history.length - 1]?.id === pair.white.id;
            const isLatestBlack = pair.black && history[history.length - 1]?.id === pair.black.id;

            return (
              <div
                key={`pair-${pair.number}`}
                className="grid grid-cols-[2.5rem_1fr_1fr] items-center py-1 px-2 rounded hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-400 font-medium">
                  {pair.number}.
                </span>

                {/* White Move */}
                <div
                  className={`flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors ${
                    isLatestWhite
                      ? 'bg-sky-100 text-sky-900 font-bold border border-sky-300 shadow-sm'
                      : 'text-slate-700'
                  }`}
                >
                  <span>{pair.white?.san}</span>
                  {pair.white?.captured && (
                    <span className="text-[9px] text-rose-600 font-bold">×</span>
                  )}
                </div>

                {/* Black Move */}
                <div
                  className={`flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors ${
                    isLatestBlack
                      ? 'bg-rose-100 text-rose-900 font-bold border border-rose-300 shadow-sm'
                      : 'text-slate-700'
                  }`}
                >
                  <span>{pair.black?.san || ''}</span>
                  {pair.black?.captured && (
                    <span className="text-[9px] text-sky-600 font-bold">×</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
