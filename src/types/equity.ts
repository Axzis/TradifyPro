import type { Timestamp } from "firebase/firestore";

export type EquityTransactionType = "deposit" | "withdraw";

export interface EquityTransaction {
  id: string;
  userId: string;
  type: EquityTransactionType;
  amount: number;
  date: Timestamp | Date;
  notes?: string;
  createdAt: Timestamp;
}
