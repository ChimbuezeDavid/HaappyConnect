import { create } from 'zustand';
import { api } from '../lib/api';
import { Transaction } from '../types';

interface WalletState {
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  totalEarned: number;
  totalSpent: number;
  
  transactions: Transaction[];
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  
  page: number;
  hasMore: boolean;
  
  fetchBalance: () => Promise<void>;
  fetchTransactions: (refresh?: boolean, filterType?: string, search?: string) => Promise<void>;
  depositFunds: (amount: number, redirectUri: string) => Promise<{ authorizationUrl: string; reference: string; isMock: boolean }>;
  verifyDeposit: (reference: string) => Promise<void>;
  withdrawFunds: (data: { amount: number; bankName: string; accountNumber: string; accountName: string }) => Promise<void>;
  clearWalletState: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  availableBalance: 0,
  pendingBalance: 0,
  totalBalance: 0,
  totalEarned: 0,
  totalSpent: 0,
  
  transactions: [],
  isLoading: false,
  isActionLoading: false,
  error: null,
  
  page: 1,
  hasMore: false,

  fetchBalance: async () => {
    try {
      const data = await api.get('/wallet/balance');
      set({
        availableBalance: data.availableBalance,
        pendingBalance: data.pendingBalance,
        totalBalance: data.totalBalance,
        totalEarned: data.totalEarned,
        totalSpent: data.totalSpent,
      });
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      set({ error: err.message || 'Failed to fetch balance' });
    }
  },

  fetchTransactions: async (refresh = false, filterType = 'all', search = '') => {
    const currentPage = refresh ? 1 : get().page;
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        type: filterType,
        search: search
      });

      const response = await api.get(`/wallet/transactions?${queryParams.toString()}`);
      
      set((state) => ({
        transactions: refresh 
          ? response.transactions 
          : [...state.transactions, ...response.transactions],
        page: response.pagination.page + 1,
        hasMore: response.pagination.hasMore,
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      set({ error: err.message || 'Failed to fetch transactions', isLoading: false });
    }
  },

  depositFunds: async (amount, redirectUri) => {
    set({ isActionLoading: true, error: null });
    try {
      const data = await api.post('/wallet/deposit', { amount, redirect_uri: redirectUri });
      set({ isActionLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Deposit initialization failed', isActionLoading: false });
      throw err;
    }
  },

  verifyDeposit: async (reference) => {
    set({ isActionLoading: true, error: null });
    try {
      await api.post('/wallet/verify', { reference });
      
      // Refresh balance and transaction list
      await get().fetchBalance();
      await get().fetchTransactions(true);
      
      set({ isActionLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Deposit verification failed', isActionLoading: false });
      throw err;
    }
  },

  withdrawFunds: async (withdrawalData) => {
    set({ isActionLoading: true, error: null });
    try {
      await api.post('/wallet/withdraw', withdrawalData);
      
      // Refresh balance and transaction list
      await get().fetchBalance();
      await get().fetchTransactions(true);
      
      set({ isActionLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Withdrawal request failed', isActionLoading: false });
      throw err;
    }
  },

  clearWalletState: () => {
    set({
      availableBalance: 0,
      pendingBalance: 0,
      totalBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      transactions: [],
      page: 1,
      hasMore: false,
      error: null
    });
  }
}));
