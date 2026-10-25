import { describe, it, expect } from 'vitest';
import { renderBoardToCanvas } from '../src/render/boardRenderer';
import { Square } from '../src/core/types';

function mockCtx(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'getTransform') return () => ({ a: 1 });
      if (prop in obj) return obj[prop as string];
      return () => undefined;
    },
    set(obj, prop, value) {
      obj[prop as string] = value;
      return true;
    }
  }) as unknown as CanvasRenderingContext2D;
}

describe('board renderer influence layers', () => {
  it('renders pattern washes and tempo outlines without throwing', () => {
    const ctx = mockCtx();
    expect(() =>
      renderBoardToCanvas(ctx, {
        width: 600,
        height: 600,
        flipped: false,
        selectedSquare: 'a1',
        lastMove: null,
        checkSquare: null,
        hoverSquare: null,
        influenceWash: { a2: 1, b2: 0.5, c3: 0.25 } as Record<Square, number>,
        influenceHue: 240,
        influencePattern: { root: 'a1', type: 'r', color: 'w' },
        influenceTempoBySquare: { a2: 1, b2: 2, c3: 3 } as Record<Square, number>
      })
    ).not.toThrow();
  });

  it('renders the solid fallback when no pattern is supplied', () => {
    const ctx = mockCtx();
    expect(() =>
      renderBoardToCanvas(ctx, {
        width: 600,
        height: 600,
        flipped: true,
        selectedSquare: null,
        lastMove: null,
        checkSquare: null,
        hoverSquare: null,
        influenceWash: { a2: 1 } as Record<Square, number>,
        influenceHue: 0
      })
    ).not.toThrow();
  });
});
