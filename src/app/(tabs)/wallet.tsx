import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Sparkles,
  RefreshCw,
  Video,
  MessageSquare,
  HelpCircle,
  Wifi,
} from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';

// Modals
import DepositModal from '@/components/wallet/DepositModal';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import TransactionDetailModal from '@/components/wallet/TransactionDetailModal';

export default function WalletScreen() {
  const { user, profile, token, isGuest, activeViewMode } = useAuthStore();
  const insets = useSafeAreaInsets();
  const {
    availableBalance,
    pendingBalance,
    totalBalance,
    totalEarned,
    totalSpent,
    transactions,
    isLoading,
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
  const isExpert = user?.role === 'expert' && (activeViewMode ? activeViewMode === 'expert' : true);

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
      return transactions.filter((t) => t.type === 'deposit');
    }
    if (selectedFilter === 'consultations') {
      return transactions.filter((t) => t.type === 'charge' || t.type === 'payout');
    }
    if (selectedFilter === 'payouts') {
      return transactions.filter((t) => t.type === 'withdrawal' || t.type === 'payout');
    }
    return transactions;
  }, [transactions, selectedFilter]);

  // Compute expert channel metrics
  const expertMetrics = useMemo(() => {
    const callConsultations = transactions.filter(
      (t) => (t.type === 'payout' || t.type === 'charge') && t.description?.toLowerCase().includes('call')
    );
    const writtenConsultations = transactions.filter(
      (t) => (t.type === 'payout' || t.type === 'charge') && (t.description?.toLowerCase().includes('question') || t.description?.toLowerCase().includes('review'))
    );
    const callRevenue = callConsultations.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const writtenRevenue = writtenConsultations.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      callCount: callConsultations.length,
      callRevenue,
      writtenCount: writtenConsultations.length,
      writtenRevenue,
    };
  }, [transactions]);

  const formatTxDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch {
      return dateString;
    }
  };

  const getTxTypeBadge = (tx: Transaction) => {
    switch (tx.type) {
      case 'deposit':
        return { label: 'Deposit', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' };
      case 'withdrawal':
        return { label: 'Bank Payout', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' };
      case 'payout':
        return { label: 'Advisory Revenue', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' };
      case 'charge':
        return { label: 'Consultation Fee', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400' };
      case 'refund':
        return { label: 'Escrow Refund', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' };
      default:
        return { label: 'Transaction', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' };
    }
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
          maxWidth: isDesktop ? 920 : undefined,
          alignSelf: 'center',
          paddingHorizontal: isDesktop ? 36 : 18,
          paddingTop: isDesktop ? 28 : (insets.top > 0 ? insets.top + 10 : 16),
          paddingBottom: isDesktop ? 48 : 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BAR: Executive Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
              {isExpert ? 'ADVISORY EARNINGS' : 'FINANCIAL OVERVIEW'}
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isExpert ? 'Earnings' : 'Wallet'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setHideBalance(!hideBalance)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm"
              activeOpacity={0.8}
            >
              {hideBalance ? (
                <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              ) : (
                <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onRefresh}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm"
              activeOpacity={0.8}
            >
              <RefreshCw size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* MODERN HERO BALANCE DISPLAY (CASH APP / REVOLUT STYLE)       */}
        {/* ============================================================ */}
        <View
          style={{
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#E2E8F0',
          }}
          className="rounded-3xl p-7 mb-6 border shadow-sm items-center relative overflow-hidden"
        >
          <Text className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            {isExpert ? 'Available Withdrawable Payout' : 'Available Cash Balance'}
          </Text>

          <View className="flex-row items-baseline mb-2">
            <Text className="text-2xl font-bold text-slate-400 dark:text-slate-500 mr-1">₦</Text>
            <Text className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              {hideBalance ? '••••••' : availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mt-1 mb-6">
            <ShieldCheck size={13} color="#059669" style={{ marginRight: 5 }} />
            <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              Paystack Verified • Escrow Protected
            </Text>
          </View>

          {/* QUICK ACTION BUTTONS STRIP */}
          <View className="flex-row justify-center items-center gap-8 sm:gap-12 w-full pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {/* Action 1: Add Money (Deposit) */}
            <TouchableOpacity
              onPress={() => setDepositVisible(true)}
              activeOpacity={0.8}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-2xl bg-primary-500 justify-center items-center shadow-lg shadow-primary-500/30 mb-2">
                <Plus size={24} color="#FFFFFF" />
              </View>
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isExpert ? 'Add Funds' : 'Add Cash'}
              </Text>
            </TouchableOpacity>

            {/* Action 2: Withdraw (Bank Transfer) */}
            <TouchableOpacity
              onPress={() => setWithdrawVisible(true)}
              activeOpacity={0.8}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 justify-center items-center mb-2">
                <Building2 size={24} color="#3B82F6" />
              </View>
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isExpert ? 'Cash Out' : 'Withdraw'}
              </Text>
            </TouchableOpacity>

            {/* Action 3: Statements */}
            <TouchableOpacity
              onPress={() => setSelectedFilter('consultations')}
              activeOpacity={0.8}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 justify-center items-center mb-2">
                <Clock size={22} color={isDark ? '#CBD5E1' : '#475569'} />
              </View>
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Statements
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* NIGERIAN SETTLEMENT ACCOUNT CARD (FOR EXPERTS)               */}
        {/* ============================================================ */}
        {isExpert && (
          <View
            style={{
              backgroundColor: isDark ? '#111822' : '#FFFFFF',
              borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
            }}
            className="rounded-3xl p-5 mb-6 border shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="p-2.5 bg-blue-500/10 rounded-2xl mr-3">
                  <Building2 size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Verified Payout Account
                  </Text>
                  <Text className="text-xs text-slate-400">
                    NIBSS Automated Nigerian Clearing
                  </Text>
                </View>
              </View>

              <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                  Connected
                </Text>
              </View>
            </View>

            <View className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {profile?.fullName || user?.email || 'Registered Expert'}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Instant settlement on consultation completion
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWithdrawVisible(true)}
                className="bg-primary-500/10 px-3.5 py-1.5 rounded-xl border border-primary-500/20"
                activeOpacity={0.8}
              >
                <Text className="text-primary-600 dark:text-primary-400 text-xs font-bold">Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* REVENUE BREAKDOWN TILES (FOR EXPERTS)                        */}
        {/* ============================================================ */}
        {isExpert && (
          <View className="flex-row gap-3 mb-6">
            <View
              style={{
                backgroundColor: isDark ? '#111822' : '#FFFFFF',
                borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
              }}
              className="flex-1 p-4 rounded-3xl border shadow-sm"
            >
              <View className="flex-row items-center mb-2">
                <View className="p-2 bg-emerald-500/10 rounded-xl mr-2">
                  <Video size={16} color="#059669" />
                </View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Live Calls
                </Text>
              </View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {hideBalance ? '₦ •••' : `₦${expertMetrics.callRevenue.toLocaleString()}`}
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {expertMetrics.callCount} session{expertMetrics.callCount !== 1 ? 's' : ''} completed
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isDark ? '#111822' : '#FFFFFF',
                borderColor: isDark ? '#1F2B3A' : '#E7E1D8',
              }}
              className="flex-1 p-4 rounded-3xl border shadow-sm"
            >
              <View className="flex-row items-center mb-2">
                <View className="p-2 bg-blue-500/10 rounded-xl mr-2">
                  <MessageSquare size={16} color="#3B82F6" />
                </View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Written Q&A
                </Text>
              </View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                {hideBalance ? '₦ •••' : `₦${expertMetrics.writtenRevenue.toLocaleString()}`}
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {expertMetrics.writtenCount} review{expertMetrics.writtenCount !== 1 ? 's' : ''} answered
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* ESCROW GUARANTEE BANNER (FOR SEEKERS)                        */}
        {/* ============================================================ */}
        {!isExpert && (
          <View className="bg-emerald-500/10 border border-emerald-500/25 rounded-3xl p-4 mb-6 flex-row items-center shadow-sm">
            <ShieldCheck size={24} color="#059669" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                100% Escrow Protection
              </Text>
              <Text className="text-slate-600 dark:text-slate-300 text-xs mt-0.5 leading-relaxed">
                Funds are held in escrow and only released to the mentor when you receive your answer or finish your call. If unanswered within 72h, you are automatically refunded.
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TRANSACTION LEDGER & SEGMENTED FILTER PILLS                  */}
        {/* ============================================================ */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Activity Ledger ({filteredTransactions.length})
          </Text>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 -mx-1 px-1">
          <TouchableOpacity
            onPress={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-2xl mr-2 border ${
              selectedFilter === 'all'
                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Activity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('deposits')}
            className={`px-4 py-2 rounded-2xl mr-2 border ${
              selectedFilter === 'deposits'
                ? 'bg-emerald-600 border-emerald-600'
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
            className={`px-4 py-2 rounded-2xl mr-2 border ${
              selectedFilter === 'consultations'
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === 'consultations' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Consultations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('payouts')}
            className={`px-4 py-2 rounded-2xl mr-2 border ${
              selectedFilter === 'payouts'
                ? 'bg-blue-600 border-blue-600'
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

        {/* Ledger Items */}
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
          <View className="gap-2.5">
            {filteredTransactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const typeBadge = getTxTypeBadge(tx);

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
                  className="p-4 rounded-2xl border flex-row justify-between items-center shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    {/* Status Circle Icon */}
                    <View
                      className={`w-10 h-10 rounded-2xl justify-center items-center mr-3 ${
                        isPositive ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft size={18} color="#059669" />
                      ) : (
                        <ArrowUpRight size={18} color="#64748B" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {tx.description || (tx.type === 'deposit' ? 'Wallet Deposit' : 'Consultation Payment')}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Text className="text-[11px] text-slate-400">
                          {formatTxDate(tx.createdAt)}
                        </Text>
                        <View className={`px-2 py-0.2 rounded-full ${typeBadge.bg}`}>
                          <Text className={`text-[9px] font-extrabold uppercase ${typeBadge.text}`}>
                            {typeBadge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`text-sm font-black ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isPositive ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      {tx.status === 'success' && <CheckCircle2 size={10} color="#059669" style={{ marginRight: 3 }} />}
                      {tx.status === 'pending' && <Clock size={10} color="#D97706" style={{ marginRight: 3 }} />}
                      <Text
                        className={`text-[10px] font-bold capitalize ${
                          tx.status === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.status === 'pending'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-500'
                        }`}
                      >
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
