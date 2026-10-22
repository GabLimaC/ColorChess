import React from 'react';
import { CapturedPieces, PieceType, PieceColor } from '../core/types';
import { PiecePrism, PieceStyle } from './pieces/PiecePrism';

interface CapturedTrayProps {
  captured: CapturedPieces;
  turn: PieceColor;
  pieceStyle?: PieceStyle;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

export const CapturedTray: React.FC<CapturedTrayProps> = ({ captured, pieceStyle = 'custom' }) => {
  // White captured black pieces; Black captured white pieces
  const whiteAdvantage = captured.w.reduce((acc, p) => acc + PIECE_VALUES[p], 0) -
                         captured.b.reduce((acc, p) => acc + PIECE_VALUES[p], 0);

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {/* White Team Tray (Captured Black pieces) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_6px_#0284c7]" />
          <span className="text-xs font-mono font-medium text-slate-700">White</span>
          {whiteAdvantage > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
              +{whiteAdvantage}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-0.5 max-h-7 overflow-x-auto">
          {captured.w.length === 0 ? (
            <span className="text-[11px] font-mono text-slate-400 italic">No captures</span>
          ) : (
            captured.w.map((p, i) => (
              <div key={`w-cap-${i}`} className="w-5 h-5 flex-shrink-0" title={`Black ${p.toUpperCase()}`}>
                <PiecePrism type={p} color="b" pieceStyle={pieceStyle} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Black Team Tray (Captured White pieces) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#e11d48]" />
          <span className="text-xs font-mono font-medium text-slate-700">Black</span>
          {whiteAdvantage < 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
              +{Math.abs(whiteAdvantage)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-0.5 max-h-7 overflow-x-auto">
          {captured.b.length === 0 ? (
            <span className="text-[11px] font-mono text-slate-400 italic">No captures</span>
          ) : (
            captured.b.map((p, i) => (
              <div key={`b-cap-${i}`} className="w-5 h-5 flex-shrink-0" title={`White ${p.toUpperCase()}`}>
                <PiecePrism type={p} color="w" pieceStyle={pieceStyle} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
