import React, { useState, useMemo } from 'react';
import { Square, BoardPiece, LegalMove, PieceType, PieceColor, OpticalField, BoardMode, InteractionMode, InfluencePattern } from '../core/types';
import { PiecePaintMap } from '../core/paintEngine';
import { OpticalCanvas } from '../render/OpticalCanvas';
import { PieceOverlay } from './PieceOverlay';
import { PromotionModal } from './PromotionModal';
import { PieceStyle } from './pieces/PiecePrism';

interface ChessBoardProps {
  pieces: BoardPiece[];
  turn: PieceColor;
  flipped: boolean;
  selectedSquare: Square | null;
  legalMoves: LegalMove[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  opticalField: OpticalField;
  showBeams: boolean;
  lightOpacity?: number;
  pieceStyle?: PieceStyle;
  boardMode?: BoardMode;
  interactionMode?: InteractionMode;
  selectedSquares?: Set<Square>;
  piecePaints?: PiecePaintMap | null;
  affectedSquares?: Set<Square> | null;
  influenceWash?: Record<Square, number> | null;
  influenceHue?: number;
  influencePattern?: InfluencePattern | null;
  influenceTempoBySquare?: Record<Square, number> | null;
  hoverSquare?: Square | null;
  onHoverSquareChange?: (square: Square | null) => void;
  onSelectSquare: (square: Square | null) => void;
  onTogglePieceSelect?: (square: Square) => void;
  onClearSelection?: () => void;
  onMove: (from: Square, to: Square, promotion?: PieceType) => void;
  className?: string;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  pieces,
  turn,
  flipped,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  opticalField,
  showBeams,
  lightOpacity,
  pieceStyle = 'custom',
  boardMode = 'color',
  interactionMode = 'play',
  selectedSquares,
  piecePaints,
  affectedSquares,
  influenceWash,
  influenceHue,
  influencePattern,
  influenceTempoBySquare,
  hoverSquare,
  onHoverSquareChange,
  onSelectSquare,
  onTogglePieceSelect,
  onClearSelection,
  onMove,
  className = ''
}) => {
  const [internalHoverSquare, setInternalHoverSquare] = useState<Square | null>(null);
  const activeHoverSquare = hoverSquare !== undefined ? hoverSquare : internalHoverSquare;
  const handleHoverChange = onHoverSquareChange || setInternalHoverSquare;
  const [promotionTarget, setPromotionTarget] = useState<{ from: Square; to: Square } | null>(null);

  // Find king square under check
  const checkSquare = useMemo(() => {
    if (!isCheck) return null;
    const king = pieces.find(p => p.type === 'k' && p.color === turn);
    return king ? king.square : null;
  }, [pieces, turn, isCheck]);

  const handleRequestPromotion = (from: Square, to: Square) => {
    setPromotionTarget({ from, to });
  };

  const handleConfirmPromotion = (piece: PieceType) => {
    if (promotionTarget) {
      onMove(promotionTarget.from, promotionTarget.to, piece);
      setPromotionTarget(null);
      onSelectSquare(null);
    }
  };

  const handleCancelPromotion = () => {
    setPromotionTarget(null);
  };

  return (
    <div className={`relative aspect-square w-full max-w-[620px] mx-auto select-none ${className}`}>
      {/* Outer Anodized Aluminum Lab Frame */}
      <div className="absolute -inset-2.5 rounded-2xl bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 p-[1px] shadow-lg border border-slate-300 pointer-events-none">
        <div className="w-full h-full rounded-2xl bg-white/60 backdrop-blur-md" />
      </div>

      {/* Primary Board Area: White & Light-Grey Optical Grid */}
      <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-300 shadow-md">
        {/* Optical 2D Canvas Surface */}
        <OpticalCanvas
          flipped={flipped}
          selectedSquare={selectedSquare}
          lastMove={lastMove}
          checkSquare={checkSquare}
          hoverSquare={activeHoverSquare}
          opticalField={opticalField}
          affectedSquares={affectedSquares}
          influenceWash={influenceWash}
          influenceHue={influenceHue}
          influencePattern={influencePattern}
          influenceTempoBySquare={influenceTempoBySquare}
          boardMode={boardMode}
          showBeams={showBeams}
          lightOpacity={lightOpacity}
          className="absolute inset-0"
        />

        {/* Piece & Interaction Overlay */}
        <PieceOverlay
          pieces={pieces}
          turn={turn}
          flipped={flipped}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          checkSquare={checkSquare}
          lastMove={lastMove}
          pieceStyle={pieceStyle}
          interactionMode={interactionMode}
          selectedSquares={selectedSquares}
          piecePaints={piecePaints}
          onTogglePieceSelect={onTogglePieceSelect}
          onClearSelection={onClearSelection}
          onSelectSquare={onSelectSquare}
          onMove={onMove}
          onRequestPromotion={handleRequestPromotion}
          onHoverSquareChange={handleHoverChange}
        />
      </div>

      {/* Pawn Promotion Modal */}
      {promotionTarget && (
        <PromotionModal
          color={turn}
          pieceStyle={pieceStyle}
          onSelect={handleConfirmPromotion}
          onCancel={handleCancelPromotion}
        />
      )}
    </div>
  );
};
