import React, { useRef, useEffect, useCallback } from 'react';
import { Square, OpticalField, BoardMode, InfluencePattern } from '../core/types';
import { renderBoardToCanvas, BoardRenderOptions } from './boardRenderer';
import { renderBeamsToCanvas, BeamRenderOptions } from './beamRenderer';

interface OpticalCanvasProps {
  flipped: boolean;
  selectedSquare: Square | null;
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  hoverSquare: Square | null;
  opticalField?: OpticalField | null;
  affectedSquares?: Set<Square> | null;
  influenceWash?: Record<Square, number> | null;
  influenceHue?: number;
  influencePattern?: InfluencePattern | null;
  influenceTempoBySquare?: Record<Square, number> | null;
  boardMode?: BoardMode;
  showBeams?: boolean;
  lightOpacity?: number;
  className?: string;
}

export const OpticalCanvas: React.FC<OpticalCanvasProps> = ({
  flipped,
  selectedSquare,
  lastMove,
  checkSquare,
  hoverSquare,
  opticalField,
  affectedSquares,
  influenceWash,
  influenceHue,
  influencePattern,
  influenceTempoBySquare,
  boardMode = 'color',
  showBeams = false,
  lightOpacity,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));

    if (size <= 0) return;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Render board surface with flat Hue washes, coordinates, and affected squares black borders
    const boardOptions: BoardRenderOptions = {
      width: size,
      height: size,
      flipped,
      selectedSquare,
      lastMove,
      checkSquare,
      hoverSquare,
      opticalField,
      affectedSquares,
      influenceWash,
      influenceHue,
      influencePattern,
      influenceTempoBySquare,
      boardMode,
      lightOpacity
    };
    renderBoardToCanvas(ctx, boardOptions);

    // Beams replaced on selection by affected square black borders
    if (showBeams && opticalField?.rays && !selectedSquare) {
      const beamOptions: BeamRenderOptions = {
        width: size,
        height: size,
        flipped,
        showBeams: true,
        selectedSquare: null
      };
      renderBeamsToCanvas(ctx, opticalField.rays, beamOptions);
    }

    ctx.restore();
  }, [flipped, selectedSquare, lastMove, checkSquare, hoverSquare, opticalField, affectedSquares, influenceWash, influenceHue, influencePattern, influenceTempoBySquare, boardMode, showBeams, lightOpacity]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="block rounded-lg shadow-2xl"
      />
    </div>
  );
};
