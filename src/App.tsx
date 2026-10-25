import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OpticalChessGame } from './core/chessGame';
import {
  Square,
  PieceType,
  PresetScenario,
  BoardMode,
  InteractionMode,
  InfluenceDepth,
  InfluenceTempo,
  LightColorFilter
} from './core/types';
import { computeOpticalField } from './core/opticalEngine';
import { computePiecePaints } from './core/paintEngine';
import {
  buildInfluenceWash,
  computeInfluenceField,
  computeInfluenceFieldAfterMove,
  INFLUENCE_TEMPO_ALPHA,
  tempoMapToWash
} from './core/influenceEngine';
import { sideHue } from './render/lightTypes';
import { ChessBoard } from './components/ChessBoard';
import { ControlSpectrumReference } from './components/ControlSpectrumReference';
import { StatusHUD } from './components/StatusHUD';
import { CapturedTray } from './components/CapturedTray';
import { MoveHistory } from './components/MoveHistory';
import { GameControls } from './components/GameControls';
import { OpticalHUD } from './components/OpticalHUD';
import { LightTypeLegend } from './components/LightTypeLegend';
import { PieceStyle } from './components/pieces/PiecePrism';
import { MovementVisualizerPage } from './visualizer/MovementVisualizerPage';
import { Sparkles, Compass, ShieldCheck, Grid3x3 } from 'lucide-react';

export const App: React.FC = () => {
  // Initialize chess engine
  const [game] = useState(() => new OpticalChessGame());
  const [view, setView] = useState<'lab' | 'visualizer'>('lab');
  const [version, setVersion] = useState(0); // Trigger re-render on game mutation
  const [flipped, setFlipped] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<Set<Square>>(() => new Set());
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('play');
  const [hoverSquare, setHoverSquare] = useState<Square | null>(null);
  const [showBeams, setShowBeams] = useState(true);
  const [lightOpacity, setLightOpacity] = useState(0.55);
  const [emissionTypes, setEmissionTypes] = useState<Set<PieceType>>(
    () => new Set(['p', 'n', 'b', 'r', 'q', 'k'])
  );
  const [savedEmissionTypes, setSavedEmissionTypes] = useState<Set<PieceType> | null>(null);
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>('classic');
  const [boardMode, setBoardMode] = useState<BoardMode>('color');
  const [influenceView, setInfluenceView] = useState(false);
  const [influenceTempo, setInfluenceTempo] = useState<InfluenceTempo>(1);
  const [lightColorFilter, setLightColorFilter] = useState<LightColorFilter>('all');

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
    return computeOpticalField(pieces, { emissionTypes, lightColorFilter });
  }, [pieces, emissionTypes, lightColorFilter]);

  // Explore future move: when a piece is selected and user hovers over a legal destination square,
  // simulate the move and project how the entire board will look
  const previewData = useMemo(() => {
    if (interactionMode === 'selection' || !selectedSquare || !hoverSquare) return null;
    const isLegalTarget = legalMoves.some(m => m.to === hoverSquare);
    if (!isLegalTarget) return null;

    const simulatedPieces = game.getSimulatedPiecesAfterMove(selectedSquare, hoverSquare);
    if (!simulatedPieces) return null;

    const simulatedField = computeOpticalField(simulatedPieces, { emissionTypes, lightColorFilter });
    return {
      pieces: simulatedPieces,
      opticalField: simulatedField,
      targetSquare: hoverSquare
    };
  }, [game, selectedSquare, hoverSquare, legalMoves, interactionMode, emissionTypes, lightColorFilter]);

  const activePieces = previewData?.pieces ?? pieces;
  const activeOpticalField = previewData?.opticalField ?? opticalField;

  // Partial paint on occupied squares: defended -> team hue, attacked -> opposing hue,
  // both -> resulting green standoff. Pieces seen by no ray keep their base color.
  const piecePaints = useMemo(
    () => computePiecePaints(activePieces, activeOpticalField),
    [activePieces, activeOpticalField]
  );

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

  // Piece Influence View: tempo-layered safe landing squares for the selected piece
  const selectedPiece = useMemo(() => {
    if (!selectedSquare) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    version;
    return game.getPieceAt(selectedSquare);
  }, [game, selectedSquare, version]);

  const influenceHue = useMemo(
    () => (selectedPiece ? sideHue(selectedPiece.color) : 240),
    [selectedPiece]
  );

  const influenceDisplay = useMemo(() => {
    if (!influenceView || interactionMode !== 'play' || !selectedSquare || !selectedPiece) {
      return null;
    }

    if (previewData) {
      const field =
        influenceTempo >= 2
          ? computeInfluenceFieldAfterMove(
              game.getFen(),
              selectedSquare,
              previewData.targetSquare,
              (influenceTempo - 1) as InfluenceDepth
            )
          : null;

      const layers = {} as Record<Square, number>;
      const tempoBySquare = {} as Record<Square, number>;

      if (field) {
        for (const [square, tempo] of Object.entries(field.tempoBySquare)) {
          if (tempo <= 0) continue;
          const displayTempo = Math.min(3, tempo + 1);
          layers[square as Square] = displayTempo;
          tempoBySquare[square as Square] = displayTempo;
        }
      }

      layers[previewData.targetSquare] = 1;
      for (const square of affectedSquares) {
        layers[square] = 1;
      }

      return {
        wash: tempoMapToWash(layers, INFLUENCE_TEMPO_ALPHA),
        tempoBySquare,
        pattern: {
          root: previewData.targetSquare,
          type: selectedPiece.type,
          color: selectedPiece.color
        }
      };
    }

    const field = computeInfluenceField(game.getFen(), selectedSquare, influenceTempo);
    if (!field) return null;

    return {
      wash: buildInfluenceWash(field, INFLUENCE_TEMPO_ALPHA),
      tempoBySquare: field.tempoBySquare,
      pattern: {
        root: field.root,
        type: selectedPiece.type,
        color: selectedPiece.color
      }
    };
  }, [
    influenceView,
    interactionMode,
    selectedSquare,
    selectedPiece,
    previewData,
    affectedSquares,
    game,
    influenceTempo,
    version
  ]);

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

  const handleChangeLightOpacity = useCallback((value: number) => {
    setLightOpacity(Math.min(1, Math.max(0, value)));
  }, []);

  const handleToggleEmissionType = useCallback((type: PieceType) => {
    setEmissionTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleEnableAllEmission = useCallback(() => {
    const allOn = new Set(['p', 'n', 'b', 'r', 'q', 'k'] as PieceType[]);
    if (emissionTypes.size === allOn.size) {
      // Toggling back: restore the previous per-type selection
      setEmissionTypes(savedEmissionTypes ? new Set(savedEmissionTypes) : allOn);
    } else {
      setSavedEmissionTypes(new Set(emissionTypes));
      setEmissionTypes(allOn);
    }
  }, [emissionTypes, savedEmissionTypes]);

  const handleDisableAllEmission = useCallback(() => {
    if (emissionTypes.size === 0) {
      // Toggling back: restore the previous per-type selection
      setEmissionTypes(
        savedEmissionTypes && savedEmissionTypes.size > 0
          ? new Set(savedEmissionTypes)
          : new Set(['p', 'n', 'b', 'r', 'q', 'k'] as PieceType[])
      );
    } else {
      setSavedEmissionTypes(new Set(emissionTypes));
      setEmissionTypes(new Set());
    }
  }, [emissionTypes, savedEmissionTypes]);

  const handleToggleInfluenceView = useCallback(() => {
    setInfluenceView(v => !v);
  }, []);

  const handleChangeLightColorFilter = useCallback((filter: LightColorFilter) => {
    setLightColorFilter(filter);
  }, []);

  const handleChangeInfluenceTempo = useCallback((tempo: InfluenceTempo) => {
    setInfluenceTempo(tempo);
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

  const handleLoadPgn = useCallback((pgn: string): boolean => {
    const success = game.loadPgn(pgn);
    if (success) {
      setSelectedSquare(null);
      setSelectedSquares(new Set());
      setHoverSquare(null);
      setVersion(v => v + 1);
      return true;
    }
    return false;
  }, [game]);

  const handleSeek = useCallback((ply: number) => {
    const success = game.seekToPly(ply);
    if (success) {
      setSelectedSquare(null);
      setSelectedSquares(new Set());
      setHoverSquare(null);
      setVersion(v => v + 1);
    }
  }, [game]);

  // Keyboard replay navigation: ←/↑ previous ply, →/↓ next ply, Home start, End final position
  useEffect(() => {
    if (!gameState.isReplay) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentPly = game.getGameState().currentPly;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handleSeek(currentPly - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          handleSeek(currentPly + 1);
          break;
        case 'Home':
          e.preventDefault();
          handleSeek(-1);
          break;
        case 'End':
          e.preventDefault();
          handleSeek(game.getGameState().moveHistory.length - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, gameState.isReplay, handleSeek]);

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
                {view === 'visualizer'
                  ? '16 × 16 Movement Field Explorer'
                  : 'Light-Field Engine & Top-Down Optical Beam Manipulators'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setView('lab')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all ${
                  view === 'lab'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Optical chess laboratory"
              >
                Chess Lab
              </button>
              <button
                onClick={() => setView('visualizer')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all ${
                  view === 'visualizer'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="16 × 16 movement visualizer"
              >
                <Grid3x3 className="w-3 h-3" />
                <span className="hidden sm:inline">Movement Visualizer</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FIDE Engine Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Play Area Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {view === 'visualizer' ? (
          <MovementVisualizerPage />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Center Column: Board, Turn HUD, Transmission Log, Captured Tray */}
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
                    influenceWash={influenceDisplay?.wash ?? null}
                    influenceHue={influenceHue}
                    influencePattern={influenceDisplay?.pattern ?? null}
                    influenceTempoBySquare={influenceDisplay?.tempoBySquare ?? null}
                    hoverSquare={hoverSquare}
                    onHoverSquareChange={setHoverSquare}
                    showBeams={showBeams}
                    lightOpacity={lightOpacity}
                    pieceStyle={pieceStyle}
                    boardMode={boardMode}
                    interactionMode={interactionMode}
                    selectedSquares={selectedSquares}
                    piecePaints={piecePaints}
                    onSelectSquare={handleSelectSquare}
                    onTogglePieceSelect={handleTogglePieceSelect}
                    onClearSelection={handleClearSelection}
                    onMove={handleMove}
                  />
                </div>
              </div>
            </div>

            {/* Transmission Move Log: left side, aligned under the board, always visible */}
            <div className="max-w-[720px] mx-auto">
              <MoveHistory
                history={gameState.moveHistory}
                activePly={gameState.currentPly}
                isReplay={gameState.isReplay}
                onSeek={handleSeek}
                pgnHeaders={gameState.pgnHeaders}
              />
            </div>

            {/* Captured Pieces Tray */}
            <CapturedTray
              captured={gameState.capturedPieces}
              turn={gameState.turn}
              pieceStyle={pieceStyle}
            />
          </div>

          {/* Right Column: Controls, Optical HUD, Light Vocabulary */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Optical Field Flux Balance Meter */}
            <OpticalHUD
              opticalField={activeOpticalField}
              halfMoves={gameState.halfMoves}
              fullMoves={gameState.fullMoves}
              showBeams={showBeams}
              onToggleBeams={handleToggleBeams}
              lightOpacity={lightOpacity}
              onChangeLightOpacity={handleChangeLightOpacity}
              emissionTypes={emissionTypes}
              onToggleEmissionType={handleToggleEmissionType}
              onEnableAllEmission={handleEnableAllEmission}
              onDisableAllEmission={handleDisableAllEmission}
              lightColorFilter={lightColorFilter}
              onChangeLightColorFilter={handleChangeLightColorFilter}
            />

            {/* Sandbox & Game Controls */}
            <GameControls
              flipped={flipped}
              canUndo={gameState.isReplay ? gameState.currentPly >= 0 : gameState.moveHistory.length > 0}
              currentFen={gameState.fen}
              pieceStyle={pieceStyle}
              boardMode={boardMode}
              interactionMode={interactionMode}
              selectedCount={selectedSquares.size}
              influenceView={influenceView}
              influenceTempo={influenceTempo}
              onToggleInfluenceView={handleToggleInfluenceView}
              onChangeInfluenceTempo={handleChangeInfluenceTempo}
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
              onLoadPgn={handleLoadPgn}
            />

            {/* Light Type Vocabulary */}
            <LightTypeLegend />

            {/* Optical Beam Morphology Note */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1.5 shadow-xs">
              <div className="flex items-center space-x-1.5 text-slate-800 font-semibold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Range-Sharpness Optical Morphology</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Sharper shapes project longer range; softer shapes project shorter range:
                <strong className="text-slate-800 block mt-1">King (Range 1)</strong> Thick square frame: fills to the touching edge, stops short of the far edge.
                <strong className="text-slate-800 block">Pawn (Range 1 diag)</strong> Compact blunt V with short rounded arms (low range).
                <strong className="text-slate-800 block">Knight (Range ~2)</strong> Subtly contoured octagon with gentle waists (intermediate range).
                <strong className="text-slate-800 block">Rook (Range 7)</strong> Orthogonal cross glass prism (+).
                <strong className="text-slate-800 block">Bishop (Range 7)</strong> Diagonal cross glass prism (×).
                <strong className="text-slate-800 block">Queen (Range 7+)</strong> Sharpest 8-pointed starburst collimator prism.
              </p>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};
