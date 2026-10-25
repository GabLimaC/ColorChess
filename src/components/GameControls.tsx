import React, { useState } from 'react';
import { PRESETS } from '../core/chessGame';
import { PresetScenario, BoardMode, InteractionMode, InfluenceTempo } from '../core/types';
import { PieceStyle } from './pieces/PiecePrism';
import {
  RotateCcw,
  Undo2,
  RefreshCw,
  Sparkles,
  Clipboard,
  Check,
  ChevronDown,
  Shapes,
  Palette,
  MousePointerClick,
  Eye,
  EyeOff,
  FileUp
} from 'lucide-react';

interface GameControlsProps {
  flipped: boolean;
  canUndo: boolean;
  currentFen: string;
  pieceStyle: PieceStyle;
  boardMode: BoardMode;
  interactionMode?: InteractionMode;
  selectedCount?: number;
  whitePieceCount?: number;
  blackPieceCount?: number;
  influenceView?: boolean;
  influenceTempo?: InfluenceTempo;
  onReset: () => void;
  onUndo: () => void;
  onFlip: () => void;
  onTogglePieceStyle: (style: PieceStyle) => void;
  onToggleBoardMode: (mode: BoardMode) => void;
  onToggleInteractionMode?: (mode: InteractionMode) => void;
  onClearSelection?: () => void;
  onSelectAllWhite?: () => void;
  onSelectAllBlack?: () => void;
  onSelectAll?: () => void;
  onLoadPreset: (preset: PresetScenario) => void;
  onLoadCustomFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
  onToggleInfluenceView?: () => void;
  onChangeInfluenceTempo?: (tempo: InfluenceTempo) => void;
  className?: string;
}

export const GameControls: React.FC<GameControlsProps> = ({
  flipped,
  canUndo,
  currentFen,
  pieceStyle,
  boardMode,
  interactionMode = 'play',
  selectedCount = 0,
  whitePieceCount = 16,
  blackPieceCount = 16,
  onReset,
  onUndo,
  onFlip,
  onTogglePieceStyle,
  onToggleBoardMode,
  onToggleInteractionMode,
  onClearSelection,
  onSelectAllWhite,
  onSelectAllBlack,
  onSelectAll,
  onLoadPreset,
  onLoadCustomFen,
  onLoadPgn,
  influenceView = false,
  influenceTempo = 1,
  onToggleInfluenceView,
  onChangeInfluenceTempo,
  className = ''
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [customFenInput, setCustomFenInput] = useState('');
  const [fenError, setFenError] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [pgnError, setPgnError] = useState(false);

  const handleApplyCustomFen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFenInput.trim()) return;
    const success = onLoadCustomFen(customFenInput.trim());
    if (success) {
      setFenError(false);
      setCustomFenInput('');
    } else {
      setFenError(true);
    }
  };

  const handleCopyFen = async () => {
    try {
      await navigator.clipboard.writeText(currentFen);
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleLoadPgn = () => {
    if (!pgnInput.trim()) return;
    const success = onLoadPgn(pgnInput.trim());
    if (success) {
      setPgnInput('');
      setPgnError(false);
    } else {
      setPgnError(true);
    }
  };

  const handlePgnFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setPgnInput(text);
      setPgnError(false);
    } catch {
      setPgnError(true);
    }
    e.target.value = '';
  };

  return (
    <div className={`space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm ${className}`}>
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onReset}
          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-mono text-xs transition-colors shadow-sm"
          title="Reset board to starting position"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono text-xs border transition-colors shadow-sm ${
            canUndo
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
          }`}
          title="Undo previous move"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onFlip}
          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-mono text-xs transition-colors shadow-sm group"
          title="Flip board view perspective"
        >
          <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
          <span>{flipped ? 'Black' : 'White'}</span>
        </button>
      </div>

      {/* Mode Switch: Play Mode vs Selection Mode */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-300">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
          <MousePointerClick className="w-3.5 h-3.5 text-slate-600" />
          <span>Mode</span>
        </div>
        <div className="flex items-center space-x-1 bg-white p-0.5 rounded-md border border-slate-300">
          <button
            onClick={() => onToggleInteractionMode?.('play')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              interactionMode === 'play'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Play mode: standard chess moves and turns"
          >
            Play
          </button>
          <button
            onClick={() => onToggleInteractionMode?.('selection')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              interactionMode === 'selection'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Selection mode: select 1 or more pieces (any side) to highlight influence"
          >
            Selection
          </button>
        </div>
      </div>

      {/* Piece Influence View: play mode only */}
      {interactionMode === 'play' && (
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
              {influenceView ? (
                <Eye className="w-3.5 h-3.5 text-sky-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Piece Influence View</span>
            </div>
            <button
              onClick={onToggleInfluenceView}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
                influenceView
                  ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs'
                  : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
              title="Toggle tempo-layered safe landing squares for the selected piece"
            >
              <span className={`w-2 h-2 rounded-full ${influenceView ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{influenceView ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {influenceView && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-600">Tempo</span>
                <div className="flex items-center space-x-1 bg-white p-0.5 rounded-md border border-slate-300">
                  {([1, 2, 3] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => onChangeInfluenceTempo?.(t)}
                      aria-label={`Show squares reachable within ${t} tempo${t > 1 ? 's' : ''}`}
                      title={`Within ${t} tempo${t > 1 ? 's' : ''}`}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                        influenceTempo === t
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] font-mono leading-relaxed text-slate-500">
                100% = 1 tempo · 50% = 2 · 25% = 3. Solid / dashed / dotted outlines mark
                the 1 / 2 / 3 tempo layers. Hover a legal move to preview its vision.
                Safe = not attacked by the opponent.
              </p>
            </>
          )}
        </div>
      )}

      {/* Selection Mode Quick Controls */}
      {interactionMode === 'selection' && (
        <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sky-900 font-semibold">
              {selectedCount === 0
                ? 'Click pieces (any side)'
                : `${selectedCount} piece${selectedCount > 1 ? 's' : ''} selected`}
            </span>
            {selectedCount > 0 && onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline transition-colors"
                title="Deselect all pieces"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              onClick={onSelectAllWhite}
              className="py-1 px-1.5 rounded bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10px] text-center font-medium transition-colors shadow-2xs"
              title="Select all White pieces"
            >
              White ({whitePieceCount})
            </button>
            <button
              onClick={onSelectAllBlack}
              className="py-1 px-1.5 rounded bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] text-center font-medium transition-colors shadow-2xs"
              title="Select all Black pieces"
            >
              Black ({blackPieceCount})
            </button>
            <button
              onClick={onSelectAll}
              className="py-1 px-1.5 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-[10px] text-center font-medium transition-colors shadow-2xs"
              title="Select all pieces on the board"
            >
              All ({whitePieceCount + blackPieceCount})
            </button>
          </div>
        </div>
      )}

      {/* Board View Switch: Optical Color vs Classic Black & White */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-300">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
          <Palette className="w-3.5 h-3.5 text-slate-600" />
          <span>Board View</span>
        </div>
        <div className="flex items-center space-x-1 bg-white p-0.5 rounded-md border border-slate-300">
          <button
            onClick={() => onToggleBoardMode('color')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              boardMode === 'color'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Optical chromatic tension & control fields"
          >
            Color
          </button>
          <button
            onClick={() => onToggleBoardMode('hybrid')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              boardMode === 'hybrid'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Optical light fields on a white/grey checkerboard"
          >
            Hybrid
          </button>
          <button
            onClick={() => onToggleBoardMode('bw')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              boardMode === 'bw'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Classic black and white chess board"
          >
            B &amp; W
          </button>
        </div>
      </div>

      {/* Piece Style Switch: Custom Prisms vs Normal Classic Pieces */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-300">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-700">
          <Shapes className="w-3.5 h-3.5 text-slate-600" />
          <span>Piece View</span>
        </div>
        <div className="flex items-center space-x-1 bg-white p-0.5 rounded-md border border-slate-300">
          <button
            onClick={() => onTogglePieceStyle('custom')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              pieceStyle === 'custom'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Geometric optical prism shapes"
          >
            Custom
          </button>
          <button
            onClick={() => onTogglePieceStyle('classic')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
              pieceStyle === 'classic'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Normal classic Staunton chess pieces"
          >
            Normal
          </button>
        </div>
      </div>

      {/* Preset Scenarios Menu */}
      <div className="relative">
        <button
          onClick={() => setShowPresetsMenu(!showPresetsMenu)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 font-mono text-xs text-slate-800 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Tactical Scenarios & Presets</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showPresetsMenu ? 'rotate-180' : ''}`} />
        </button>

        {showPresetsMenu && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white border border-slate-300 rounded-xl p-1.5 shadow-xl space-y-1">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  onLoadPreset(preset);
                  setShowPresetsMenu(false);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors group flex flex-col"
              >
                <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-600 font-mono">
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FEN Sandbox Loader & Exporter */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            FEN Position String
          </span>
          <button
            onClick={handleCopyFen}
            className="flex items-center space-x-1 text-[11px] font-mono text-slate-600 hover:text-sky-600 transition-colors"
            title="Copy current FEN to clipboard"
          >
            {copiedFen ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
            <span>{copiedFen ? 'Copied' : 'Copy FEN'}</span>
          </button>
        </div>

        <form onSubmit={handleApplyCustomFen} className="flex space-x-1.5">
          <input
            type="text"
            placeholder="Paste custom FEN string..."
            value={customFenInput}
            onChange={e => {
              setCustomFenInput(e.target.value);
              setFenError(false);
            }}
            className={`flex-1 bg-slate-50 border ${
              fenError ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-800'
            } rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-400`}
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 transition-colors"
          >
            Load
          </button>
        </form>
        {fenError && (
          <div className="text-[10px] font-mono text-rose-600">
            Invalid FEN string format. Please verify and retry.
          </div>
        )}
      </div>

      {/* PGN Import & Replay Loader */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            PGN Import
          </span>
          <label
            className="flex items-center space-x-1 text-[11px] font-mono text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
            title="Read a .pgn file into the textarea"
          >
            <FileUp className="w-3 h-3" />
            <span>File</span>
            <input
              type="file"
              accept=".pgn,application/x-chess-pgn,text/plain"
              className="hidden"
              onChange={handlePgnFile}
            />
          </label>
        </div>

        <textarea
          rows={5}
          placeholder="Paste PGN game export here..."
          value={pgnInput}
          onChange={e => {
            setPgnInput(e.target.value);
            setPgnError(false);
          }}
          className={`w-full bg-slate-50 border ${
            pgnError ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-800'
          } rounded-lg px-2.5 py-1.5 text-xs font-mono resize-y focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-400`}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-[10px] font-mono text-rose-600">
            {pgnError ? 'Invalid PGN. Verify and retry.' : ''}
          </div>
          <button
            type="button"
            onClick={handleLoadPgn}
            disabled={!pgnInput.trim()}
            className={`px-3 py-1.5 border rounded-lg text-xs font-mono transition-colors ${
              pgnInput.trim()
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Load &amp; Replay
          </button>
        </div>
      </div>
    </div>
  );
};
