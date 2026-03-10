import { BillData } from '@repo/types';
import { create } from 'zustand';

interface BillStore {
  currentBillData:     BillData | null;
  currentAccount:      string   | null;
  currentSpkey:        string   | null;
  currentOperatorName: string   | null;
  currentCategory:     string   | null;

  setBillData:      (bill: BillData | null) => void;
  setAccountDetails: (details: {
    account:      string;
    spkey:        string;
    operatorName: string;
    category:     string;
  }) => void;
  clearBill: () => void;
}

export const useBillStore = create<BillStore>((set) => ({
  currentBillData:     null,
  currentAccount:      null,
  currentSpkey:        null,
  currentOperatorName: null,
  currentCategory:     null,

  setBillData: (bill) => set({ currentBillData: bill }),

  setAccountDetails: (details) => set({
    currentAccount:      details.account,
    currentSpkey:        details.spkey,
    currentOperatorName: details.operatorName,
    currentCategory:     details.category,
  }),

  clearBill: () => set({
    currentBillData:     null,
    currentAccount:      null,
    currentSpkey:        null,
    currentOperatorName: null,
    currentCategory:     null,
  }),
}));
