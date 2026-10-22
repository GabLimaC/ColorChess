import React, { useState, useRef, useCallback } from 'react';
import { Square, BoardPiece, LegalMove, PieceType, PieceColor, InteractionMode } from '../core/types';
import { PiecePrism, PieceStyle } from './pieces/PiecePrism';

export function squareToColRow(square: Square, flipped: boolean): { col: number; row: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  const col = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;
  return { col, row };
}

export function colRowToSquare(col: number, row: number, flipped: boolean): Square | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = flipped ? 7 - col : col;
  const rank = flipped ? row : 7 - row;
  return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}` as Square;
}

interface PieceOverlayProps {
  pieces: BoardPiece[];
  turn: PieceColor;
  flipped: boolean;
  selectedSquare: Square | null;
  legalMoves: LegalMove[];
  checkSquare: Square | null;
  pieceStyle?: PieceStyle;
  interactionMode?: InteractionMode;
  selectedSquares?: Set<Square>;
  onTogglePieceSelect?: (square: Square) => void;
  onClearSelection?: () => void;
  onSelectSquare: (square: Square | null) => void;
  onMove: (from: Square, to: Square, promotion?: PieceType) => void;
  onRequestPromotion: (from: Square, to: Square) => void;
  onHoverSquareChange?: (square: Square | null) => void;
}

interface DragState {
  piece: BoardPiece;
  startSquare: Square;
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  hasMovedSignificantly: boolean;
}

export const PieceOverlay: React.FC<PieceOverlayProps> = ({
  pieces,
  turn,
  flipped,
  selectedSquare,
  legalMoves,
  pieceStyle = 'custom',
  interactionMode = 'play',
  selectedSquares,
  onTogglePieceSelect,
  onClearSelection,
  onSelectSquare,
  onMove,
  onRequestPromotion,
  onHoverSquareChange
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const isSelectionMode = interactionMode === 'selection';

  // Map legal targets
  const legalTargetMap = new Map<Square, LegalMove>();
  if (!isSelectionMode) {
    legalMoves.forEach(m => legalTargetMap.set(m.to, m));
  }

  const getSquareFromPointer = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const board = boardRef.current;
      if (!board) return null;
      const rect = board.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

      const squareWidth = rect.width / 8;
      const squareHeight = rect.height / 8;
      const col = Math.floor(x / squareWidth);
      const row = Math.floor(y / squareHeight);

      return colRowToSquare(col, row, flipped);
    },
    [flipped]
  );

  const handlePointerDown = (piece: BoardPiece, e: React.PointerEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onTogglePieceSelect?.(piece.square);
      return;
    }

    if (selectedSquare && legalTargetMap.has(piece.square)) {
      handleSquareClick(piece.square);
      return;
    }

    if (piece.color !== turn) {
      return;
    }

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setDragState({
      piece,
      startSquare: piece.square,
      currentX: startX,
      currentY: startY,
      startX,
      startY,
      hasMovedSignificantly: false
    });

    onSelectSquare(piece.square);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const sq = getSquareFromPointer(e.clientX, e.clientY);
    onHoverSquareChange?.(sq);

    if (!dragState || !boardRef.current) return;
    e.preventDefault();

    const rect = boardRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const dist = Math.hypot(curX - dragState.startX, curY - dragState.startY);
    const hasMoved = dragState.hasMovedSignificantly || dist > 6;

    setDragState(prev => (prev ? {
      ...prev,
      currentX: curX,
      currentY: curY,
      hasMovedSignificantly: hasMoved
    } : null));
  };

  const handlePointerLeave = () => {
    if (!dragState) {
      onHoverSquareChange?.(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.preventDefault();

    const targetSquare = getSquareFromPointer(e.clientX, e.clientY);

    if (dragState.hasMovedSignificantly && targetSquare && targetSquare !== dragState.startSquare) {
      const move = legalTargetMap.get(targetSquare);
      if (move) {
        if (move.isPromotion) {
          onRequestPromotion(dragState.startSquare, targetSquare);
        } else {
          onMove(dragState.startSquare, targetSquare);
          onSelectSquare(null);
        }
      }
    }

    setDragState(null);
    onHoverSquareChange?.(null);
  };

  const handlePointerCancel = () => {
    setDragState(null);
    onHoverSquareChange?.(null);
  };

  const handleSquareClick = (square: Square) => {
    if (isSelectionMode) {
      const pieceOnSquare = pieces.find(p => p.square === square);
      if (pieceOnSquare) {
        onTogglePieceSelect?.(square);
      } else {
        onClearSelection?.();
      }
      return;
    }

    if (!selectedSquare) {
      const pieceOnSquare = pieces.find(p => p.square === square);
      if (pieceOnSquare && pieceOnSquare.color === turn) {
        onSelectSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      onSelectSquare(null);
      return;
    }

    const move = legalTargetMap.get(square);
    if (move) {
      if (move.isPromotion) {
        onRequestPromotion(selectedSquare, square);
      } else {
        onMove(selectedSquare, square);
        onSelectSquare(null);
      }
      return;
    }

    const pieceOnSquare = pieces.find(p => p.square === square);
    if (pieceOnSquare && pieceOnSquare.color === turn) {
      onSelectSquare(square);
      return;
    }

    onSelectSquare(null);
  };

  return (
    <div
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="absolute inset-0 select-none touch-none cursor-default"
    >
      {/* 64 Click Target Zones (Pure click hitboxes, no move indicator dots or rings) */}
      {Array.from({ length: 64 }).map((_, idx) => {
        const col = idx % 8;
        const row = Math.floor(idx / 8);
        const sq = colRowToSquare(col, row, flipped);
        if (!sq) return null;

        return (
          <div
            key={`cell-${sq}`}
            onClick={() => handleSquareClick(sq)}
            style={{
              position: 'absolute',
              left: `${col * 12.5}%`,
              top: `${row * 12.5}%`,
              width: '12.5%',
              height: '12.5%'
            }}
            className="cursor-pointer pointer-events-auto"
          />
        );
      })}

      {/* Static / Base Pieces (With clear selection indicator in selection and play mode) */}
      {pieces.map(piece => {
        const isBeingDragged = dragState?.piece.id === piece.id;
        const { col, row } = squareToColRow(piece.square, flipped);
        const isSelected = isSelectionMode
          ? (selectedSquares?.has(piece.square) ?? false)
          : selectedSquare === piece.square;

        return (
          <div
            key={piece.id}
            onPointerDown={e => handlePointerDown(piece, e)}
            style={{
              position: 'absolute',
              left: `${col * 12.5}%`,
              top: `${row * 12.5}%`,
              width: '12.5%',
              height: '12.5%',
              opacity: isBeingDragged ? 0.3 : 1,
              pointerEvents: isBeingDragged ? 'none' : 'auto'
            }}
            className={`flex items-center justify-center p-1 transition-all ${
              isSelectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            <div
              className={`w-full h-full relative flex items-center justify-center rounded-xl transition-all ${
                isSelected
                  ? piece.color === 'w'
                    ? 'ring-2 ring-sky-500 bg-sky-500/20 shadow-sm'
                    : 'ring-2 ring-rose-500 bg-rose-500/20 shadow-sm'
                  : ''
              }`}
            >
              <PiecePrism
                type={piece.type}
                color={piece.color}
                pieceStyle={pieceStyle}
              />
            </div>
          </div>
        );
      })}

      {/* Floating Dragged Piece */}
      {dragState && boardRef.current && (
        <div
          style={{
            position: 'absolute',
            left: dragState.currentX,
            top: dragState.currentY,
            width: `${boardRef.current.clientWidth / 8}px`,
            height: `${boardRef.current.clientHeight / 8}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 40
          }}
        >
          <PiecePrism
            type={dragState.piece.type}
            color={dragState.piece.color}
            pieceStyle={pieceStyle}
          />
        </div>
      )}
    </div>
  );
};
