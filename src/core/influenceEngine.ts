import { Chess, Move, Square as ChessJsSquare } from 'chess.js';
import {
  InfluenceDepth,
  InfluenceField,
  PieceColor,
  PieceType,
  Square
} from './types';

const MAX_STATES = 5000;

export const INFLUENCE_TEMPO_ALPHA: Record<number, number> = {
  1: 1,
  2: 0.5,
  3: 0.25
};

interface FrontierState {
  fen: string;
  square: Square;
}

function toAnalysisFen(fen: string, color: PieceColor): string {
  const parts = fen.split(' ');
  if (parts.length < 6) return fen;
  parts[1] = color;
  parts[3] = '-';
  parts[4] = '0';
  parts[5] = '1';
  return parts.join(' ');
}

function getMovesForPiece(
  fen: string,
  square: Square,
  cache: Map<string, Move[]>
): Move[] {
  const key = `${fen}|${square}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const byTarget = new Map<Square, Move>();
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ square: square as ChessJsSquare, verbose: true });
    for (const move of moves) {
      const target = move.to as Square;
      const existing = byTarget.get(target);
      if (!existing || (move.promotion === 'q' && existing.promotion !== 'q')) {
        byTarget.set(target, move);
      }
    }
  } catch {
    // Invalid position: treat as no moves.
  }

  const result = Array.from(byTarget.values());
  cache.set(key, result);
  return result;
}

function makeChildFen(
  parentFen: string,
  from: Square,
  move: Move,
  color: PieceColor
): string | null {
  try {
    const chess = new Chess(parentFen);
    const result = chess.move({
      from: from as ChessJsSquare,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {})
    });
    if (!result) return null;
    return toAnalysisFen(chess.fen(), color);
  } catch {
    return null;
  }
}

function isSquareAttacked(
  fen: string,
  square: Square,
  enemy: PieceColor,
  cache: Map<string, boolean>
): boolean {
  const key = `${fen}|${square}|${enemy}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let attacked = false;
  try {
    const chess = new Chess(fen);
    attacked = chess.isAttacked(square as ChessJsSquare, enemy);
  } catch {
    attacked = false;
  }
  cache.set(key, attacked);
  return attacked;
}

export function computeInfluenceField(
  fen: string,
  root: Square,
  maxTempo: InfluenceDepth
): InfluenceField | null {
  if (maxTempo < 1) return null;

  let piece: { color: PieceColor; type: PieceType } | null = null;
  let turn: PieceColor = 'w';
  try {
    const chess = new Chess(fen);
    const found = chess.get(root as ChessJsSquare);
    if (!found) return null;
    piece = { color: found.color as PieceColor, type: found.type as PieceType };
    turn = chess.turn() as PieceColor;
  } catch {
    return null;
  }

  const color = piece.color;
  const enemy: PieceColor = color === 'w' ? 'b' : 'w';
  const rootFen = turn === color ? fen : toAnalysisFen(fen, color);

  const moveCache = new Map<string, Move[]>();
  const attackCache = new Map<string, boolean>();
  const visited = new Set<string>([rootFen]);
  const tempoBySquare = {} as Record<Square, number>;

  let frontier: FrontierState[] = [{ fen: rootFen, square: root }];

  for (let tempo = 1; tempo <= maxTempo && frontier.length > 0; tempo++) {
    const next: FrontierState[] = [];

    for (const state of frontier) {
      const moves = getMovesForPiece(state.fen, state.square, moveCache);

      for (const move of moves) {
        const target = move.to as Square;
        if (target === root) continue;

        const childFen = makeChildFen(state.fen, state.square, move, color);
        if (!childFen) continue;
        if (isSquareAttacked(childFen, target, enemy, attackCache)) continue;

        if (tempoBySquare[target] === undefined) {
          tempoBySquare[target] = tempo;
        }

        if (
          tempo < maxTempo &&
          !visited.has(childFen) &&
          visited.size < MAX_STATES
        ) {
          visited.add(childFen);
          next.push({ fen: childFen, square: target });
        }
      }
    }

    frontier = next;
  }

  return { root, color, maxTempo, tempoBySquare };
}

export function computeInfluenceFieldAfterMove(
  fen: string,
  from: Square,
  to: Square,
  maxTempo: InfluenceDepth,
  promotion: PieceType = 'q'
): InfluenceField | null {
  if (maxTempo < 1) return null;

  try {
    const chess = new Chess(fen);
    const result = chess.move({
      from: from as ChessJsSquare,
      to: to as ChessJsSquare,
      promotion: promotion as Exclude<PieceType, 'k' | 'p'>
    });
    if (!result) return null;
    return computeInfluenceField(chess.fen(), to, maxTempo);
  } catch {
    return null;
  }
}

export function tempoMapToWash(
  tempoBySquare: Record<Square, number>,
  alphaByTempo: Record<number, number>
): Record<Square, number> {
  const wash = {} as Record<Square, number>;
  for (const [square, tempo] of Object.entries(tempoBySquare)) {
    if (tempo <= 0) continue;
    const alpha = alphaByTempo[tempo];
    if (!alpha || alpha <= 0) continue;
    wash[square as Square] = alpha;
  }
  return wash;
}

export function buildInfluenceWash(
  field: InfluenceField | null,
  alphaByTempo: Record<number, number>
): Record<Square, number> | null {
  if (!field) return null;
  return tempoMapToWash(field.tempoBySquare, alphaByTempo);
}
