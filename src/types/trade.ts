import type { Timestamp } from "firebase/firestore";

export type AssetType = 'Saham' | 'Kripto' | 'Forex';
export type Position = 'Long' | 'Short';

export interface Trade {
  id: string;
  userId:string;
  ticker: string;
  assetType: AssetType;
  position: Position;

  openDate: Timestamp | Date;
  closeDate?: Timestamp | Date | null;

  entryPrice: number;
  exitPrice?: number | null;
  positionSize: number;
  commission?: number;

  stopLossPrice?: number;
  takeProfitPrice?: number;

  tags?: string[];
  entryReason?: string;

  imageUrlBefore?: string;
  imageUrlAfter?: string;

  createdAt: Timestamp;
}
