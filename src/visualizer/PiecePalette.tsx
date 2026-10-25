import React from 'react';
import { PieceColor, PieceType } from '../core/types';
import { PiecePrism, PieceStyle } from '../components/pieces/PiecePrism';
import { VisualPiece } from './types';

const PIECE_TYPES: Array<{ type: PieceType; label: string }> = [
  { type: 'p', label: 'Pawn' },
  { type: 'n', label: 'Knight' },
  { type: 'b', label: 'Bishop' },
  { type: 'r', label: 'Rook' },
  { type: 'q', label: 'Queen' },
  { type: 'k', label: 'King' }
];

const PIECE_COLORS: Array<{ color: PieceColor; label: string }> = [
  { color: 'w', label: 'White' },
  { color: 'b', label: 'Black' }
];

interface PiecePaletteProps {
  piece: VisualPiece;
  onSelect: (type: PieceType, color: PieceColor) => void;
  pieceStyle?: PieceStyle;
  className?: string;
}

export const PiecePalette: React.FC<PiecePaletteProps> = ({
  piece,
  onSelect,
  pieceStyle = 'custom',
  className = ''
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
          Piece Palette
        </span>
        <span className="text-[10px] font-mono text-slate-400">6 × 2</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PIECE_TYPES.map(({ type, label }) =>
          PIECE_COLORS.map(({ color, label: colorLabel }) => {
            const isSelected = piece.type === type && piece.color === color;
            const selectedClass =
              color === 'w'
                ? 'border-sky-400 bg-sky-50 text-sky-900 ring-2 ring-sky-200'
                : 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-200';

            return (
              <button
                key={`${type}-${color}`}
                onClick={() => onSelect(type, color)}
                title={`Spawn a ${colorLabel.toLowerCase()} ${label.toLowerCase()}`}
                className={`flex items-center space-x-2 px-2 py-1.5 rounded-lg border font-mono text-[11px] transition-colors ${
                  isSelected
                    ? selectedClass
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6 shrink-0">
                  <PiecePrism type={type} color={color} pieceStyle={pieceStyle} />
                </div>
                <span className="truncate">
                  {colorLabel} {label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
