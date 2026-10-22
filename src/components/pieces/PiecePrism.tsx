import React from 'react';
import { PieceType, PieceColor } from '../../core/types';
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
}

export const PiecePrism: React.FC<PiecePrismProps> = ({
  type,
  color,
  pieceStyle = 'custom',
  className = '',
  isCheck = false
}) => {
  if (pieceStyle === 'classic') {
    return <ClassicPiece type={type} color={color} className={className} isCheck={isCheck} />;
  }

  switch (type) {
    case 'p':
      return <PawnPrism color={color} className={className} isCheck={isCheck} />;
    case 'n':
      return <KnightPrism color={color} className={className} isCheck={isCheck} />;
    case 'b':
      return <BishopPrism color={color} className={className} isCheck={isCheck} />;
    case 'r':
      return <RookPrism color={color} className={className} isCheck={isCheck} />;
    case 'q':
      return <QueenPrism color={color} className={className} isCheck={isCheck} />;
    case 'k':
      return <KingPrism color={color} className={className} isCheck={isCheck} />;
    default:
      return null;
  }
};
