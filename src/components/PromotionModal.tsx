import React from 'react';
import { PieceColor, PieceType } from '../core/types';
import { PiecePrism, PieceStyle } from './pieces/PiecePrism';

interface PromotionModalProps {
  color: PieceColor;
  pieceStyle?: PieceStyle;
  onSelect: (piece: PieceType) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  color,
  pieceStyle = 'custom',
  onSelect,
  onCancel
}) => {
  const pieces: { type: PieceType; label: string }[] = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <h3 className="text-lg font-semibold tracking-wide text-slate-900 mb-1">
          Select Optical Transform
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Pawn forward wedge converts into higher-order beam manipulator
        </p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-sky-500 transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-sm group"
            >
              <div className="w-14 h-14 mb-2 group-hover:scale-110 transition-transform">
                <PiecePrism type={type} color={color} pieceStyle={pieceStyle} />
              </div>
              <span className="text-xs font-mono text-slate-700 group-hover:text-slate-900">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-mono text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
