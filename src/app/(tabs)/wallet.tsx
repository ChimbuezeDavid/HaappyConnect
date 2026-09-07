import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Transaction } from '@/types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send,
  Zap,
  ArrowRight,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import { format, parseISO } from 'date-fns';

// Modals
import DepositModal from '@/components/wallet/DepositModal';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import TransactionDetailModal from '@/components/wallet/TransactionDetailModal';

export default function WalletScreen() {
  const { user, profile, token, isGuest } = useAuthStore();
  const {
    availableBalance,
    pendingBalance,
    totalBalance,
    totalEarned,
    totalSpent,
    transactions,
    isLoading,
    hasMore,
    fetchBalance,
    fetchTransactions,
    clearWalletState,
  } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'deposits' | 'consultations' | 'payouts'>('all');
  const [hideBalance, setHideBalance] = useState(false);

  // Modals Visibility
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isExpert = user?.role === 'expert';

  const loadData = async (refresh = true) => {
    if (isGuest || !token) return;
    await Promise.all([
      fetchBalance(),
      fetchTransactions(refresh, 'all', ''),
    ]);
  };

  useEffect(() => {
    if (isGuest || !token) {
      clearWalletState();
      return;
    }
    loadData(true);
  }, [isGuest, token]);

  if (isGuest) {
    return <SignInWall />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Filtered transactions for the ledger
  const filteredTransactions = useMemo(() => {
    if (selectedFilter === 'deposits') {
      return transactions.filter(t => t.type === 'deposit');
    }
    if (selectedFilter === 'consultations') {
      return transactions.filter(t => t.type === 'charge' || t.type === 'payout');
    }
    if (selectedFilter === 'payouts') {
      return transactions.filter(t => t.type === 'withdrawal' || t.type === 'payout');
    }
    return transactions;
  }, [transactions, selectedFilter]);

  const getTxIcon = (tx: Transaction) => {
    if (tx.type === 'deposit') {
      return <ArrowDownLeft size={18} color="#059669" />;
    }
    if (tx.type === 'withdrawal') {
      return <Building2 size={18} color="#3B82F6" />;
    }
    if (tx.type === 'payout') {
      return <ArrowUpRight size={18} color="#10B981" />;
    }
    if (tx.type === 'refund') {
      return <RefreshCw size={18} color="#D97706" />;
    }
    return <Sparkles size={18} color="#6366F1" />;
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}
    >
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{
          width: '100%',
          paddingHorizontal: isDesktop ? 36 : 18,
          paddingTop: isDesktop ? 24 : 14,
          paddingBottom: isDesktop ? 40 : 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BAR: Title & Institutional Status */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-xs uppercase tracking-widest font-extrabold text-emerald-600 dark:text-emerald-400">
              {isExpert ? 'ADVISORY REVENUE VAULT' : 'FINANCIAL VAULT & ESCROW'}
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isExpert ? 'Earnings Ledger' : 'Account Balance'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setHideBalance(!hideBalance)}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm"
          >
            {hideBalance ? (
              <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            ) : (
              <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            )}
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* COMPLETE 180° HERO FINTECH VAULT DISPLAY                     */}
        {/* ============================================================ */}
        <View
          style={{
            backgroundColor: isDark ? '#111822' : '#FFFFFF',
            borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
          }}
          className="rounded-3xl p-6 mb-6 border shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isExpert ? 'Available For Withdrawal' : 'Net Liquidity Available'}
            </Text>
            <View className="flex-row items-center bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={12} color="#059669" style={{ marginRight: 4 }} />
              <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                Paystack Direct
              </Text>
            </View>
          </View>

          {/* Crisp Primary Amount Display */}
          <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tight my-2">
            {hideBalance ? '₦ •••••••' : `₦${availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
          </Text>

          {/* Institutional Split Ledger */}
          <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex-row justify-between">
            <View>
              <View className="flex-row items-center mb-0.5">
                <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                <Text className="text-[11px] font-bold text-slate-400 uppercase">
                  {isExpert ? 'In-Review Escrow' : 'Held In Escrow'}
                </Text>
              </View>
              <Text className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                {hideBalance ? '₦ •••' : `₦${pendingBalance.toLocaleString()}`}
              </Text>
            </View>

            <View className="items-end">
              <View className="flex-row items-center mb-0.5">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                <Text className="text-[11px] font-bold text-slate-400 uppercase">
                  {isExpert ? 'Lifetime Revenue' : 'Total Deposited'}
                </Text>
              </View>
              <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                {hideBalance ? '₦ •••' : `₦${totalEarned.toLocaleString()}`}
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* INSTITUTIONAL ACTION STRIP                                   */}
        {/* ============================================================ */}
        <View className="flex-row gap-3 mb-6">
          {isExpert ? (
            <>
              <TouchableOpacity
                onPress={() => setWithdrawVisible(true)}
                activeOpacity={0.85}
                className="flex-1 bg-primary-500 py-4 px-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-primary-500/20"
              >
                <Zap size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-black text-sm">Withdraw to Bank</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDepositVisible(true)}
                activeOpacity={0.85}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 py-4 px-5 rounded-2xl flex-row items-center justify-center shadow-sm"
              >
                <Plus size={18} color={isDark ? '#FFFFFF' : '#0F172A'} style={{ marginRight: 6 }} />
                <Text className="text-slate-900 dark:text-white font-bold text-sm">Top Up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setDepositVisible(true)}
                activeOpacity={0.85}
                className="flex-1 bg-primary-500 py-4 px-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-primary-500/20"
              >
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-black text-sm">Fund Wallet (Paystack)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setWithdrawVisible(true)}
                activeOpacity={0.85}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 py-4 px-5 rounded-2xl flex-row items-center justify-center shadow-sm"
              >
                <Send size={16} color={isDark ? '#FFFFFF' : '#0F172A'} style={{ marginRight: 6 }} />
                <Text className="text-slate-900 dark:text-white font-bold text-sm">Withdraw</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ============================================================ */}
        {/* NIGERIAN BANK PAYOUT ACCOUNT CARD (FOR EXPERTS)              */}
        {/* ============================================================ */}
        {isExpert && (
          <View
            style={{
              backgroundColor: isDark ? '#111822' : '#FFFFFF',
              borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
            }}
            className="rounded-3xl p-5 mb-6 border"
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="p-2.5 bg-blue-500/10 rounded-xl mr-3">
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">
                    Direct Bank Payout Route
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    Nigerian Clearing House & NIBSS
                  </Text>
                </View>
              </View>

              <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                  Active
                </Text>
              </View>
            </View>

            <View className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {profile?.fullName || 'Account Beneficiary'}
                </Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  Automated Bank Settlement • 1-Tap Withdrawal
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWithdrawVisible(true)}
                className="bg-primary-500/10 px-3 py-1.5 rounded-xl"
              >
                <Text className="text-primary-600 dark:text-primary-400 text-xs font-bold">Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* ESCROW PROTECTION BANNER (FOR SEEKERS)                       */}
        {/* ============================================================ */}
        {!isExpert && (
          <View className="bg-emerald-500/10 border border-emerald-500/25 rounded-3xl p-4 mb-6 flex-row items-center">
            <ShieldCheck size={22} color="#059669" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                100% Escrow Protection
              </Text>
              <Text className="text-slate-600 dark:text-slate-300 text-xs mt-0.5 leading-relaxed">
                When booking mentors, funds remain securely in your escrow vault. If a question is unanswered within 72h, it is instantly refunded.
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* FINTECH TRANSACTION LEDGER & FILTER PILLS                    */}
        {/* ============================================================ */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Transaction Activity ({filteredTransactions.length})
          </Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 -mx-1 px-1">
          <TouchableOpacity
            onPress={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-xl mr-2 border ${
              selectedFilter === 'all'
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Records
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('deposits')}
            className={`px-4 py-2 rounded-xl mr-2 border ${
              selectedFilter === 'deposits'
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'deposits' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Deposits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('consultations')}
            className={`px-4 py-2 rounded-xl mr-2 border ${
              selectedFilter === 'consultations'
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'consultations' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Consultations & Escrow
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('payouts')}
            className={`px-4 py-2 rounded-xl mr-2 border ${
              selectedFilter === 'payouts'
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'payouts' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Withdrawals
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Ledger List */}
        {isLoading && transactions.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View
            style={{
              backgroundColor: isDark ? '#111822' : '#FFFFFF',
              borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
            }}
            className="rounded-3xl p-8 items-center border border-dashed"
          >
            <CreditCard size={32} color={isDark ? '#334155' : '#CBD5E1'} style={{ marginBottom: 8 }} />
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Transactions Recorded
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              Your deposits, consultation payments, and payout statements will stream here automatically.
            </Text>
          </View>
        ) : (
          <View className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isPositive = tx.amount > 0;
              let txDateStr = '';
              try {
                txDateStr = format(parseISO(tx.createdAt), 'MMM dd, yyyy • hh:mm a');
              } catch (_) {
                txDateStr = 'Recent';
              }

              return (
                <TouchableOpacity
                  key={tx._id}
                  onPress={() => {
                    setSelectedTx(tx);
                    setDetailVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: isDark ? '#111822' : '#FFFFFF',
                    borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
                  }}
                  className="p-4 rounded-2xl border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className={`p-2.5 rounded-xl mr-3 ${
                        tx.type === 'deposit'
                          ? 'bg-emerald-500/10'
                          : tx.type === 'withdrawal'
                          ? 'bg-blue-500/10'
                          : 'bg-amber-500/10'
                      }`}
                    >
                      {getTxIcon(tx)}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                        {tx.description || (tx.type === 'deposit' ? 'Wallet Deposit' : 'Consultation Settlement')}
                      </Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">
                        {txDateStr}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`text-sm font-black ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          tx.status === 'success'
                            ? 'bg-emerald-500'
                            : tx.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <Text className="text-[10px] uppercase font-bold text-slate-400">
                        {tx.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <DepositModal
        visible={depositVisible}
        onClose={() => setDepositVisible(false)}
        onSuccess={() => loadData(true)}
      />

      <WithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        onSuccess={() => loadData(true)}
        availableBalance={availableBalance}
      />

      <TransactionDetailModal
        visible={detailVisible}
        transaction={selectedTx}
        onClose={() => {
          setDetailVisible(false);
          setSelectedTx(null);
        }}
      />
    </View>
  );
}
