import React from 'react';
import { PieceType, PieceColor } from '../../core/types';
import { PiecePaint } from '../../core/paintEngine';
import { PawnPrism } from './PawnPrism';
import { KnightPrism } from './KnightPrism';
import { BishopPrism } from './BishopPrism';
import { RookPrism } from './RookPrism';
import { QueenPrism } from './QueenPrism';
import { KingPrism } from './KingPrism';
import { ClassicPiece } from './ClassicPiece';

export type PieceStyle = 'custom' | 'classic';

export interface PiecePrismProps {
  type: PieceType;
  color: PieceColor;
  pieceStyle?: PieceStyle;
  className?: string;
  isCheck?: boolean;
  paint?: PiecePaint | null;
}

export const PiecePrism: React.FC<PiecePrismProps> = ({
  type,
  color,
  pieceStyle = 'custom',
  className = '',
  isCheck = false,
  paint = null
}) => {
  if (pieceStyle === 'classic') {
    return (
      <ClassicPiece
        type={type}
        color={color}
        className={className}
        isCheck={isCheck}
        paint={paint}
      />
    );
  }

  switch (type) {
    case 'p':
      return <PawnPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    case 'n':
      return <KnightPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    case 'b':
      return <BishopPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    case 'r':
      return <RookPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    case 'q':
      return <QueenPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    case 'k':
      return <KingPrism color={color} className={className} isCheck={isCheck} paint={paint} />;
    default:
      return null;
  }
};
