import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiecePrism, PieceStyle } from '../components/pieces/PiecePrism';
import { renderBoard16 } from './boardRenderer16';
import { V_BOARD_SIZE, fileRankToVSquare, vSquareToFileRank } from './movementEngine';
import { SquareInfluence, VSquare, VisualPiece } from './types';

interface MovementBoardProps {
  piece: VisualPiece;
  field: Record<VSquare, SquareInfluence>;
  reachable: VSquare[];
  tempoBySquare: Record<VSquare, number>;
  onMove: (square: VSquare) => void;
  pieceStyle?: PieceStyle;
  className?: string;
}

interface DragState {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  hasMovedSignificantly: boolean;
}

const CELL_FRACTION = 100 / V_BOARD_SIZE;

function pointerToSquare(
  clientX: number,
  clientY: number,
  rect: DOMRect
): VSquare | null {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

  const col = Math.floor(x / (rect.width / V_BOARD_SIZE));
  const row = Math.floor(y / (rect.height / V_BOARD_SIZE));
  if (col < 0 || col >= V_BOARD_SIZE || row < 0 || row >= V_BOARD_SIZE) return null;

  return fileRankToVSquare(col, V_BOARD_SIZE - 1 - row);
}

export const MovementBoard: React.FC<MovementBoardProps> = ({
  piece,
  field,
  reachable,
  tempoBySquare,
  onMove,
  pieceStyle = 'custom',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverSquare, setHoverSquare] = useState<VSquare | null>(null);

  const reachableSet = useMemo(() => new Set(reachable), [reachable]);

  const hoverValid = hoverSquare !== null && reachableSet.has(hoverSquare);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = board.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    if (size <= 0) return;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderBoard16(ctx, {
      width: size,
      height: size,
      field,
      reachable,
      tempoBySquare,
      hoverSquare,
      hoverValid
    });
    ctx.restore();
  }, [field, reachable, tempoBySquare, hoverSquare, hoverValid]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setDragState({
      currentX: startX,
      currentY: startY,
      startX,
      startY,
      hasMovedSignificantly: false
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const square = pointerToSquare(e.clientX, e.clientY, rect);
    setHoverSquare(square);

    if (!dragState) return;
    e.preventDefault();

    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const dist = Math.hypot(curX - dragState.startX, curY - dragState.startY);

    setDragState(prev =>
      prev
        ? {
            ...prev,
            currentX: curX,
            currentY: curY,
            hasMovedSignificantly: prev.hasMovedSignificantly || dist > 6
          }
        : null
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const board = boardRef.current;
    if (dragState && board) {
      e.preventDefault();
      const rect = board.getBoundingClientRect();
      const target = pointerToSquare(e.clientX, e.clientY, rect);

      if (
        dragState.hasMovedSignificantly &&
        target &&
        target !== piece.square &&
        reachableSet.has(target)
      ) {
        onMove(target);
      }
    }

    setDragState(null);
    setHoverSquare(null);
  };

  const handlePointerCancel = () => {
    setDragState(null);
    setHoverSquare(null);
  };

  const handlePointerLeave = () => {
    if (!dragState) setHoverSquare(null);
  };

  const { file, rank } = vSquareToFileRank(piece.square);
  const pieceCol = file;
  const pieceRow = V_BOARD_SIZE - 1 - rank;

  const ringClass =
    piece.color === 'w'
      ? 'border-2 border-sky-500/80 bg-sky-500/10'
      : 'border-2 border-rose-500/80 bg-rose-500/10';

  const ghostColRow =
    dragState && hoverSquare && hoverSquare !== piece.square && reachableSet.has(hoverSquare)
      ? vSquareToFileRank(hoverSquare)
      : null;

  return (
    <div className={`relative aspect-square w-full select-none ${className}`}>
      <div className="absolute inset-0 rounded-xl overflow-hidden border border-slate-300 shadow-md bg-white">
        <div
          ref={boardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="absolute inset-0 touch-none"
        >
          <canvas ref={canvasRef} className="absolute inset-0 block" />

          {/* Source square ring + draggable piece */}
          <div
            onPointerDown={handlePointerDown}
            style={{
              position: 'absolute',
              left: `${pieceCol * CELL_FRACTION}%`,
              top: `${pieceRow * CELL_FRACTION}%`,
              width: `${CELL_FRACTION}%`,
              height: `${CELL_FRACTION}%`,
              opacity: dragState ? 0.3 : 1,
              pointerEvents: dragState ? 'none' : 'auto'
            }}
            className="flex items-center justify-center p-0.5 cursor-grab active:cursor-grabbing"
          >
            <div className={`w-full h-full rounded-md ${ringClass} flex items-center justify-center p-[6%]`}>
              <PiecePrism type={piece.type} color={piece.color} pieceStyle={pieceStyle} />
            </div>
          </div>

          {/* Ghost piece on the hovered reachable square */}
          {ghostColRow && (
            <div
              style={{
                position: 'absolute',
                left: `${ghostColRow.file * CELL_FRACTION}%`,
                top: `${(V_BOARD_SIZE - 1 - ghostColRow.rank) * CELL_FRACTION}%`,
                width: `${CELL_FRACTION}%`,
                height: `${CELL_FRACTION}%`,
                pointerEvents: 'none'
              }}
              className="flex items-center justify-center p-0.5"
            >
              <div className="w-full h-full rounded-md border-2 border-emerald-500/80 bg-emerald-500/10 flex items-center justify-center p-[6%]">
                <PiecePrism type={piece.type} color={piece.color} pieceStyle={pieceStyle} />
              </div>
            </div>
          )}

          {/* Floating dragged piece */}
          {dragState && boardRef.current && (
            <div
              style={{
                position: 'absolute',
                left: dragState.currentX,
                top: dragState.currentY,
                width: `${boardRef.current.clientWidth / V_BOARD_SIZE}px`,
                height: `${boardRef.current.clientHeight / V_BOARD_SIZE}px`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 40
              }}
            >
              <PiecePrism type={piece.type} color={piece.color} pieceStyle={pieceStyle} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
