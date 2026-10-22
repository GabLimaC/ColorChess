import React, { useState, useMemo, useCallback } from 'react';
import { OpticalChessGame } from './core/chessGame';
import { Square, PieceType, PresetScenario, BoardMode, InteractionMode } from './core/types';
import { computeOpticalField } from './core/opticalEngine';
import { ChessBoard } from './components/ChessBoard';
import { ControlSpectrumReference } from './components/ControlSpectrumReference';
import { StatusHUD } from './components/StatusHUD';
import { CapturedTray } from './components/CapturedTray';
import { MoveHistory } from './components/MoveHistory';
import { GameControls } from './components/GameControls';
import { OpticalHUD } from './components/OpticalHUD';
import { PieceStyle } from './components/pieces/PiecePrism';
import { Sparkles, Compass, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  // Initialize chess engine
  const [game] = useState(() => new OpticalChessGame());
  const [version, setVersion] = useState(0); // Trigger re-render on game mutation
  const [flipped, setFlipped] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<Set<Square>>(() => new Set());
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('play');
  const [hoverSquare, setHoverSquare] = useState<Square | null>(null);
  const [showBeams, setShowBeams] = useState(true);
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>('custom');
  const [boardMode, setBoardMode] = useState<BoardMode>('color');

  // Sync state from engine
  const gameState = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    version;
    return game.getGameState();
  }, [game, version]);

  const pieces = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    version;
    return game.getAllPieces();
  }, [game, version]);

  const whitePieceCount = useMemo(() => pieces.filter(p => p.color === 'w').length, [pieces]);
  const blackPieceCount = useMemo(() => pieces.filter(p => p.color === 'b').length, [pieces]);

  const legalMoves = useMemo(() => {
    if (interactionMode === 'selection' || !selectedSquare) return [];
    return game.getLegalMovesForSquare(selectedSquare);
  }, [game, selectedSquare, interactionMode, version]);

  const opticalField = useMemo(() => {
    return computeOpticalField(pieces);
  }, [pieces]);

  // Explore future move: when a piece is selected and user hovers over a legal destination square,
  // simulate the move and project how the entire board will look
  const previewData = useMemo(() => {
    if (interactionMode === 'selection' || !selectedSquare || !hoverSquare) return null;
    const isLegalTarget = legalMoves.some(m => m.to === hoverSquare);
    if (!isLegalTarget) return null;

    const simulatedPieces = game.getSimulatedPiecesAfterMove(selectedSquare, hoverSquare);
    if (!simulatedPieces) return null;

    const simulatedField = computeOpticalField(simulatedPieces);
    return {
      pieces: simulatedPieces,
      opticalField: simulatedField,
      targetSquare: hoverSquare
    };
  }, [game, selectedSquare, hoverSquare, legalMoves, interactionMode]);

  const activePieces = previewData?.pieces ?? pieces;
  const activeOpticalField = previewData?.opticalField ?? opticalField;

  // Highlight all squares affected by the selected piece(s) with a black border
  // In selection mode: union of influence for all selected pieces (any side)
  // In play mode: affected by selected piece or hypothetical move preview
  const affectedSquares = useMemo(() => {
    const squares = new Set<Square>();
    const field = previewData?.opticalField ?? opticalField;
    if (!field?.rays) return squares;

    if (interactionMode === 'selection') {
      if (selectedSquares.size === 0) return squares;
      for (const ray of field.rays) {
        if (selectedSquares.has(ray.sourcePiece.square)) {
          for (const sq of ray.path) {
            squares.add(sq);
          }
        }
      }
      return squares;
    }

    const sourceSq = previewData?.targetSquare ?? selectedSquare;
    if (sourceSq) {
      for (const ray of field.rays) {
        if (ray.sourcePiece.square === sourceSq) {
          for (const sq of ray.path) {
            squares.add(sq);
          }
        }
      }
    }
    return squares;
  }, [interactionMode, selectedSquares, previewData, selectedSquare, opticalField]);

  // Handlers
  const handleSelectSquare = useCallback((square: Square | null) => {
    setSelectedSquare(square);
    if (!square) {
      setHoverSquare(null);
    }
  }, []);

  const handleTogglePieceSelect = useCallback((square: Square) => {
    setSelectedSquares(prev => {
      const next = new Set(prev);
      if (next.has(square)) {
        next.delete(square);
      } else {
        next.add(square);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSquares(new Set());
  }, []);

  const handleSelectAllWhite = useCallback(() => {
    const whiteSquares = pieces.filter(p => p.color === 'w').map(p => p.square);
    setSelectedSquares(new Set(whiteSquares));
  }, [pieces]);

  const handleSelectAllBlack = useCallback(() => {
    const blackSquares = pieces.filter(p => p.color === 'b').map(p => p.square);
    setSelectedSquares(new Set(blackSquares));
  }, [pieces]);

  const handleSelectAll = useCallback(() => {
    setSelectedSquares(new Set(pieces.map(p => p.square)));
  }, [pieces]);

  const handleToggleInteractionMode = useCallback((mode: InteractionMode) => {
    setInteractionMode(mode);
    if (mode === 'selection') {
      if (selectedSquare) {
        setSelectedSquares(new Set([selectedSquare]));
        setSelectedSquare(null);
      }
    } else {
      setSelectedSquares(new Set());
    }
    setHoverSquare(null);
  }, [selectedSquare]);

  const handleMove = useCallback((from: Square, to: Square, promotion: PieceType = 'q') => {
    const success = game.makeMove(from, to, promotion);
    if (success) {
      setSelectedSquare(null);
      setSelectedSquares(new Set());
      setHoverSquare(null);
      setVersion(v => v + 1);
    }
  }, [game]);

  const handleReset = useCallback(() => {
    game.reset();
    setSelectedSquare(null);
    setSelectedSquares(new Set());
    setHoverSquare(null);
    setVersion(v => v + 1);
  }, [game]);

  const handleUndo = useCallback(() => {
    const success = game.undo();
    if (success) {
      setSelectedSquare(null);
      setSelectedSquares(new Set());
      setHoverSquare(null);
      setVersion(v => v + 1);
    }
  }, [game]);

  const handleFlip = useCallback(() => {
    setFlipped(f => !f);
  }, []);

  const handleToggleBeams = useCallback(() => {
    setShowBeams(s => !s);
  }, []);

  const handleLoadPreset = useCallback((preset: PresetScenario) => {
    game.loadFen(preset.fen);
    setSelectedSquare(null);
    setSelectedSquares(new Set());
    setVersion(v => v + 1);
  }, [game]);

  const handleLoadCustomFen = useCallback((fen: string): boolean => {
    const success = game.loadFen(fen);
    if (success) {
      setSelectedSquare(null);
      setSelectedSquares(new Set());
      setVersion(v => v + 1);
      return true;
    }
    return false;
  }, [game]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-800">
      {/* Top Laboratory Header Bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-rose-100 border border-slate-300 flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 text-sky-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 font-mono">
                  OPTICAL PRISM CHESS
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                  Light Laboratory
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Light-Field Engine & Top-Down Optical Beam Manipulators
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FIDE Engine Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Play Area Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Center Column: Board, Turn HUD, Captured Tray */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Turn & Status HUD */}
            <StatusHUD
              gameState={gameState}
              interactionMode={interactionMode}
              selectedCount={selectedSquares.size}
            />

            {/* Chessboard Container: Pure Optical White Grid with Left Reference Scale */}
            <div className="p-2 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-md">
              <div className="flex items-stretch justify-center gap-2 sm:gap-4 max-w-[720px] mx-auto">
                {/* Fixed Control Spectrum Reference on the Left */}
                <ControlSpectrumReference />

                {/* Primary Chess Board */}
                <div className="flex-1 min-w-0 max-w-[620px]">
                  <ChessBoard
                    pieces={activePieces}
                    turn={gameState.turn}
                    flipped={flipped}
                    selectedSquare={selectedSquare}
                    legalMoves={legalMoves}
                    lastMove={gameState.lastMove}
                    isCheck={gameState.isCheck}
                    opticalField={activeOpticalField}
                    affectedSquares={affectedSquares}
                    hoverSquare={hoverSquare}
                    onHoverSquareChange={setHoverSquare}
                    showBeams={showBeams}
                    pieceStyle={pieceStyle}
                    boardMode={boardMode}
                    interactionMode={interactionMode}
                    selectedSquares={selectedSquares}
                    onSelectSquare={handleSelectSquare}
                    onTogglePieceSelect={handleTogglePieceSelect}
                    onClearSelection={handleClearSelection}
                    onMove={handleMove}
                  />
                </div>
              </div>
            </div>

            {/* Captured Pieces Tray */}
            <CapturedTray
              captured={gameState.capturedPieces}
              turn={gameState.turn}
              pieceStyle={pieceStyle}
            />
          </div>

          {/* Right Column: Controls, Optical HUD, Transmission Log */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Optical Field Flux Balance Meter */}
            <OpticalHUD
              opticalField={activeOpticalField}
              halfMoves={gameState.halfMoves}
              fullMoves={gameState.fullMoves}
              showBeams={showBeams}
              onToggleBeams={handleToggleBeams}
            />

            {/* Sandbox & Game Controls */}
            <GameControls
              flipped={flipped}
              canUndo={gameState.moveHistory.length > 0}
              currentFen={gameState.fen}
              pieceStyle={pieceStyle}
              boardMode={boardMode}
              interactionMode={interactionMode}
              selectedCount={selectedSquares.size}
              whitePieceCount={whitePieceCount}
              blackPieceCount={blackPieceCount}
              onReset={handleReset}
              onUndo={handleUndo}
              onFlip={handleFlip}
              onTogglePieceStyle={setPieceStyle}
              onToggleBoardMode={setBoardMode}
              onToggleInteractionMode={handleToggleInteractionMode}
              onClearSelection={handleClearSelection}
              onSelectAllWhite={handleSelectAllWhite}
              onSelectAllBlack={handleSelectAllBlack}
              onSelectAll={handleSelectAll}
              onLoadPreset={handleLoadPreset}
              onLoadCustomFen={handleLoadCustomFen}
            />

            {/* Transmission Move Log */}
            <MoveHistory history={gameState.moveHistory} />

            {/* Optical Beam Morphology Note */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 text-slate-800 font-semibold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Range-Sharpness Optical Morphology</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Sharper shapes project longer range; softer shapes project shorter range:
                <strong className="text-slate-800 block mt-1">King (Range 1)</strong> Regular symmetrical octagon (soft, bounded 1-square perimeter).
                <strong className="text-slate-800 block">Pawn (Range 1 diag)</strong> Compact blunt V with short rounded arms (low range).
                <strong className="text-slate-800 block">Knight (Range ~2)</strong> Subtly contoured octagon with gentle waists (intermediate range).
                <strong className="text-slate-800 block">Rook (Range 7)</strong> Orthogonal cross glass prism (+).
                <strong className="text-slate-800 block">Bishop (Range 7)</strong> Diagonal cross glass prism (×).
                <strong className="text-slate-800 block">Queen (Range 7+)</strong> Sharpest 8-pointed starburst collimator prism.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
