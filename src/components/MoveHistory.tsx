import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../core/types';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface MoveHistoryProps {
  history: MoveRecord[];
  activePly?: number;
  isReplay?: boolean;
  onSeek?: (ply: number) => void;
  pgnHeaders?: Record<string, string>;
  className?: string;
}

const navButtonClass = (enabled: boolean) =>
  `p-1 rounded border transition-colors ${
    enabled
      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
      : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
  }`;

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  activePly = -1,
  isReplay = false,
  onSeek,
  pgnHeaders,
  className = ''
}) => {
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
    const el = scrollRef.current;
    if (!el) return;
    if (isReplay) {
      const target = el.querySelector<HTMLElement>(`[data-ply="${activePly}"]`);
      if (target) {
        const containerRect = el.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (targetRect.top < containerRect.top) {
          el.scrollTop += targetRect.top - containerRect.top;
        } else if (targetRect.bottom > containerRect.bottom) {
          el.scrollTop += targetRect.bottom - containerRect.bottom;
        }
        return;
      }
      el.scrollTop = 0;
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [history.length, activePly, isReplay]);

  const latestId = history[history.length - 1]?.id;

  const headerLine = (() => {
    if (!pgnHeaders) return '';
    const meaningful = (value?: string) => (value && value !== '?' && value !== '*' ? value : '');
    const white = meaningful(pgnHeaders.White);
    const black = meaningful(pgnHeaders.Black);
    const result = meaningful(pgnHeaders.Result);
    const matchup = white && black ? `${white} vs ${black}` : white || black;
    return [matchup, result].filter(Boolean).join(' · ');
  })();

  const renderMoveCell = (record: MoveRecord | undefined, ply: number, side: 'white' | 'black') => {
    const isActive = record
      ? isReplay
        ? ply === activePly
        : record.id === latestId
      : false;
    const isClickable = isReplay && !!onSeek && !!record;

    const activeClass =
      side === 'white'
        ? 'bg-sky-100 text-sky-900 font-bold border border-sky-300 shadow-sm'
        : 'bg-rose-100 text-rose-900 font-bold border border-rose-300 shadow-sm';
    const idleClass = isClickable ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-700';

    const content = (
      <>
        <span>{record?.san ?? ''}</span>
        {record?.captured && (
          <span className={`text-[9px] font-bold ${side === 'white' ? 'text-rose-600' : 'text-sky-600'}`}>
            ×
          </span>
        )}
      </>
    );

    const cellClass = `flex items-center space-x-1.5 px-2 py-0.5 rounded transition-colors ${
      isActive ? activeClass : idleClass
    }`;

    if (isClickable) {
      return (
        <button
          type="button"
          data-ply={ply}
          onClick={() => onSeek?.(ply)}
          className={`${cellClass} text-left`}
          title={`Jump to ply ${ply + 1}`}
        >
          {content}
        </button>
      );
    }

    return (
      <div data-ply={ply} className={cellClass}>
        {content}
      </div>
    );
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-full shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700">
          Transmission Log
        </span>
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          {isReplay && (
            <span className="px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 font-semibold">
              Replay
            </span>
          )}
          <span className="text-slate-500">
            {history.length} {history.length === 1 ? 'ply' : 'plies'}
          </span>
        </div>
      </div>

      {isReplay && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onSeek?.(-1)}
              disabled={activePly <= -1}
              className={navButtonClass(activePly > -1)}
              title="Jump to start position"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSeek?.(activePly - 1)}
              disabled={activePly <= -1}
              className={navButtonClass(activePly > -1)}
              title="Previous move"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <span
            className="text-[11px] font-mono text-slate-600 tabular-nums"
            title="Use ← / → (or ↑ / ↓) to step through the game, Home / End to jump"
          >
            {activePly + 1} / {history.length}
          </span>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onSeek?.(activePly + 1)}
              disabled={activePly >= history.length - 1}
              className={navButtonClass(activePly < history.length - 1)}
              title="Next move"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSeek?.(history.length - 1)}
              disabled={activePly >= history.length - 1}
              className={navButtonClass(activePly < history.length - 1)}
              title="Jump to final position"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {headerLine && (
        <div className="text-[10px] font-mono text-slate-500 pb-2 truncate" title={headerLine}>
          {headerLine}
        </div>
      )}

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
            const whitePly = (pair.number - 1) * 2;
            const blackPly = whitePly + 1;

            return (
              <div
                key={`pair-${pair.number}`}
                className="grid grid-cols-[2.5rem_1fr_1fr] items-center py-1 px-2 rounded hover:bg-slate-50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => isReplay && onSeek?.(whitePly)}
                  disabled={!isReplay || !onSeek || !pair.white}
                  className={`text-left text-slate-400 font-medium rounded transition-colors ${
                    isReplay && onSeek && pair.white ? 'hover:text-slate-700' : 'cursor-default'
                  }`}
                  title={isReplay ? `Jump to move ${pair.number}` : undefined}
                >
                  {pair.number}.
                </button>

                {/* White Move */}
                {renderMoveCell(pair.white, whitePly, 'white')}

                {/* Black Move */}
                {renderMoveCell(pair.black, blackPly, 'black')}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
