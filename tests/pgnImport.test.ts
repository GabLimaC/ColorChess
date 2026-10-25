import { describe, it, expect } from 'vitest';
import { OpticalChessGame } from '../src/core/chessGame';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# — 7 plies
const SCHOLARS_MATE_PGN = `[Event "Test Match"]
[Site "?"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

describe('PGN Import & Replay', () => {
  it('imports a PGN into replay mode parked before move 1', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);

    const state = game.getGameState();
    expect(state.isReplay).toBe(true);
    expect(state.currentPly).toBe(-1);
    expect(state.fen).toBe(START_FEN);
    expect(state.moveHistory.length).toBe(7);
    expect(state.moveHistory.map(m => m.san)).toEqual(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']);
    expect(state.lastMove).toBeNull();
    expect(state.pgnHeaders.White).toBe('Alice');
    expect(state.pgnHeaders.Black).toBe('Bob');
    expect(state.pgnHeaders.Result).toBe('1-0');
  });

  it('seeks forward to the final position and back to the start', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);

    expect(game.seekToPly(6)).toBe(true);
    const finalState = game.getGameState();
    expect(finalState.currentPly).toBe(6);
    expect(finalState.lastMove).toEqual({ from: 'h5', to: 'f7' });
    expect(finalState.isCheckmate).toBe(true);
    expect(game.isCheckmate()).toBe(true);

    expect(game.seekToPly(-1)).toBe(true);
    const startState = game.getGameState();
    expect(startState.currentPly).toBe(-1);
    expect(startState.fen).toBe(START_FEN);
    expect(startState.isCheckmate).toBe(false);
    expect(startState.lastMove).toBeNull();
  });

  it('rejects out-of-range seeks without moving the board', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.seekToPly(3)).toBe(true);
    const fen = game.getFen();

    expect(game.seekToPly(7)).toBe(false);
    expect(game.seekToPly(-2)).toBe(false);
    expect(game.seekToPly(1.5)).toBe(false);

    expect(game.getFen()).toBe(fen);
    expect(game.getGameState().currentPly).toBe(3);
  });

  it('leaves the live game untouched when the PGN is invalid', () => {
    const game = new OpticalChessGame();
    expect(game.makeMove('e2', 'e4')).toBe(true);
    const before = game.getGameState();

    expect(game.loadPgn('not a pgn')).toBe(false);
    expect(game.loadPgn('   ')).toBe(false);

    const after = game.getGameState();
    expect(after.fen).toBe(before.fen);
    expect(after.moveHistory.length).toBe(1);
    expect(after.isReplay).toBe(false);
    expect(after.currentPly).toBe(0);
    expect(after.pgnHeaders).toEqual({});
  });

  it('keeps an active replay intact when a second import fails', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.seekToPly(2)).toBe(true);
    const fen = game.getFen();

    expect(game.loadPgn('not a pgn')).toBe(false);

    const state = game.getGameState();
    expect(state.isReplay).toBe(true);
    expect(state.currentPly).toBe(2);
    expect(state.moveHistory.length).toBe(7);
    expect(state.fen).toBe(fen);
  });

  it('steps back one ply per undo and returns false at the start', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.undo()).toBe(false);

    expect(game.seekToPly(6)).toBe(true);
    expect(game.undo()).toBe(true);
    expect(game.getGameState().currentPly).toBe(5);
    expect(game.getGameState().moveHistory.length).toBe(7);
    expect(game.getGameState().fen).toBe(game.getGameState().moveHistory[5].fenAfter);

    expect(game.seekToPly(0)).toBe(true);
    expect(game.undo()).toBe(true);
    expect(game.getGameState().currentPly).toBe(-1);
    expect(game.getFen()).toBe(START_FEN);
    expect(game.undo()).toBe(false);
  });

  it('truncates the continuation when a move is played mid-replay', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.seekToPly(3)).toBe(true);

    expect(game.makeMove('f1', 'c4')).toBe(true);

    const state = game.getGameState();
    expect(state.isReplay).toBe(true);
    expect(state.currentPly).toBe(4);
    expect(state.moveHistory.length).toBe(5);
    expect(state.moveHistory.map(m => m.san)).toEqual(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4']);
    expect(game.seekToPly(5)).toBe(false);
    expect(game.seekToPly(4)).toBe(true);
  });

  it('exits replay mode on reset and loadFen', () => {
    const game = new OpticalChessGame();
    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.getGameState().isReplay).toBe(true);

    game.reset();
    let state = game.getGameState();
    expect(state.isReplay).toBe(false);
    expect(state.currentPly).toBe(-1);
    expect(state.moveHistory.length).toBe(0);
    expect(state.pgnHeaders).toEqual({});

    expect(game.loadPgn(SCHOLARS_MATE_PGN)).toBe(true);
    expect(game.loadFen('8/5pk1/4p1p1/7p/3R3P/6P1/5PK1/2r5 w - - 0 40')).toBe(true);
    state = game.getGameState();
    expect(state.isReplay).toBe(false);
    expect(state.currentPly).toBe(-1);
    expect(state.moveHistory.length).toBe(0);
    expect(state.pgnHeaders).toEqual({});
  });

  it('replays games that start from a custom FEN header', () => {
    const game = new OpticalChessGame();
    const customPgn = `[SetUp "1"]
[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]

1. e4 Kd7 2. e5`;
    expect(game.loadPgn(customPgn)).toBe(true);

    const state = game.getGameState();
    expect(state.isReplay).toBe(true);
    expect(state.moveHistory.length).toBe(3);
    expect(state.fen).toBe('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

    expect(game.seekToPly(2)).toBe(true);
    expect(game.getPieceAt('e5')?.type).toBe('p');
    expect(game.seekToPly(-1)).toBe(true);
    expect(game.getPieceAt('e2')?.type).toBe('p');
  });
});
