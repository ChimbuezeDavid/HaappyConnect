import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Transaction } from '@/types';
import { 
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  Search, ArrowDownToLine, ArrowUpFromLine, Send, Settings, Eye, EyeOff, X
} from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';

// Modals
import DepositModal from '@/components/wallet/DepositModal';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import TransactionDetailModal from '@/components/wallet/TransactionDetailModal';

export default function WalletScreen() {
  const { user, token, isGuest } = useAuthStore();
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
    clearWalletState
  } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Modals Visibility
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  // Balance Visibility toggle
  const [hideBalance, setHideBalance] = useState(false);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadData = async (refresh = true) => {
    if (isGuest || !token) return;
    await Promise.all([
      fetchBalance(),
      fetchTransactions(refresh, activeFilter, searchQuery)
    ]);
  };

  useEffect(() => {
    if (isGuest || !token) {
      clearWalletState();
      return;
    }
    loadData(true);
  }, [isGuest, token, activeFilter]);

  // Handle Search Debounce / Trigger
  useEffect(() => {
    if (isGuest || !token) return;
    const delayDebounceFn = setTimeout(() => {
      fetchTransactions(true, activeFilter, searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (isGuest) {
    return <SignInWall />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      fetchTransactions(false, activeFilter, searchQuery);
    }
  };

  const handleTxPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailVisible(true);
  };

  // Date Grouping
  const groupTransactions = (txs: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    const todayStr = new Date().toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    txs.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      const txDateStr = txDate.toDateString();
      let groupKey = 'Older Transactions';

      if (txDateStr === todayStr) {
        groupKey = 'Today';
      } else if (txDateStr === yesterdayStr) {
        groupKey = 'Yesterday';
      } else {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        groupKey = `${monthNames[txDate.getMonth()]} ${txDate.getFullYear()}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });

    return groups;
  };

  const groupedTxs = groupTransactions(transactions);
  const isExpert = user?.role === 'expert';

  // Skeletons Loader
  const renderSkeletons = () => (
    <View className="space-y-3">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl flex-row justify-between items-center animate-pulse mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 mr-3" />
            <View className="space-y-1.5 flex-1">
              <View className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              <View className="h-3 bg-slate-105 dark:bg-slate-850 rounded w-1/3" />
            </View>
          </View>
          <View className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955">
      <ScrollView
        className="flex-1 px-4 py-4 max-w-2xl w-full self-center"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Balance Card */}
        <View className="bg-slate-900 dark:bg-slate-900 border border-slate-800 dark:border-slate-800 rounded-[32px] p-6 mb-6 shadow-xl relative overflow-hidden">
          {/* Gradients */}
          <View className="absolute right-0 top-0 bg-primary-500/15 w-40 h-40 rounded-full -mr-16 -mt-16" />
          <View className="absolute left-0 bottom-0 bg-emerald-500/10 w-28 h-28 rounded-full -ml-12 -mb-12" />

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-450 dark:text-slate-450 font-bold text-xs uppercase tracking-widest">
              Available Balance
            </Text>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} className="p-1">
              {hideBalance ? (
                <EyeOff size={16} color="#94a3b8" />
              ) : (
                <Eye size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-4xl font-black text-white tracking-tight">
            {hideBalance ? '₦ •••••••' : `₦${availableBalance.toLocaleString()}`}
          </Text>

          {/* Locked/Total metrics */}
          <View className="flex-row justify-between items-center mt-6 pt-5 border-t border-slate-800/80">
            <View>
              <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending (Locked)</Text>
              <Text className="text-sm font-extrabold text-slate-300 mt-0.5">
                {hideBalance ? '₦ •••' : `₦${pendingBalance.toLocaleString()}`}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Value</Text>
              <Text className="text-sm font-extrabold text-white mt-0.5">
                {hideBalance ? '₦ •••' : `₦${totalBalance.toLocaleString()}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-6">
          {isExpert ? (
            <>
              <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center shadow-sm">
                <View className="p-2 bg-emerald-500/10 rounded-xl mr-3">
                  <ArrowDownLeft size={16} color="#10b981" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Earned</Text>
                  <Text className="text-sm font-black text-slate-850 dark:text-slate-200 mt-0.5">₦{totalEarned.toLocaleString()}</Text>
                </View>
              </View>
              <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center shadow-sm">
                <View className="p-2 bg-primary-500/10 rounded-xl mr-3">
                  <ArrowUpRight size={16} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</Text>
                  <Text className="text-sm font-black text-slate-850 dark:text-slate-200 mt-0.5">₦{pendingBalance.toLocaleString()}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center shadow-sm">
                <View className="p-2 bg-primary-500/10 rounded-xl mr-3">
                  <ArrowUpRight size={16} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</Text>
                  <Text className="text-sm font-black text-slate-850 dark:text-slate-200 mt-0.5">₦{totalSpent.toLocaleString()}</Text>
                </View>
              </View>
              <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center shadow-sm">
                <View className="p-2 bg-emerald-500/10 rounded-xl mr-3">
                  <ArrowDownLeft size={16} color="#10b981" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposited</Text>
                  <Text className="text-sm font-black text-slate-850 dark:text-slate-200 mt-0.5">₦{totalEarned.toLocaleString()}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-3xl mb-6 shadow-sm">
          <Text className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-4">Quick Actions</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity 
              onPress={() => setDepositVisible(true)}
              className="items-center flex-1"
            >
              <View className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/15 mb-2">
                <ArrowDownToLine size={20} color="#10b981" />
              </View>
              <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Deposit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setWithdrawVisible(true)}
              className="items-center flex-1"
            >
              <View className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/15 mb-2">
                <ArrowUpFromLine size={20} color="#f59e0b" />
              </View>
              <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Alert.alert('Coming Soon', 'Peer-to-peer money transfers are currently in development.')}
              className="items-center flex-1"
            >
              <View className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/15 mb-2">
                <Send size={20} color="#3b82f6" />
              </View>
              <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Send</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Alert.alert('Wallet Settings', 'Security PIN and linked card options will be available in the next version.')}
              className="items-center flex-1"
            >
              <View className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-850 mb-2">
                <Settings size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </View>
              <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History Filter and List */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-extrabold text-slate-900 dark:text-white">Transaction History</Text>
            <View className="flex-row items-center">
              <ShieldCheck size={14} color="#10b981" />
              <Text className="text-[10px] font-bold text-slate-450 dark:text-slate-500 ml-1 uppercase">Ledger Secured</Text>
            </View>
          </View>

          {/* Search Box */}
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 flex-row items-center mb-4 shadow-sm">
            <Search size={16} color={isDark ? '#475569' : '#94a3b8'} className="mr-2" />
            <TextInput
              placeholder="Search description..."
              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-slate-900 dark:text-white text-sm p-0 ml-1.5"
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-5"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'deposit', label: 'Deposits' },
              { id: 'withdrawal', label: 'Payouts' },
              { id: 'payment', label: 'Payments' },
              { id: 'refund', label: 'Refunds' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                className={`py-2 px-4 rounded-full mr-2.5 ${
                  activeFilter === filter.id 
                    ? 'bg-primary-500' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Text className={`font-bold text-xs ${
                  activeFilter === filter.id 
                    ? 'text-white' 
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Transaction List */}
          {isLoading && transactions.length === 0 ? (
            renderSkeletons()
          ) : transactions.length === 0 ? (
            <View className="items-center justify-center py-12 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed shadow-sm">
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No transactions found</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1 text-center px-6">
                {searchQuery || activeFilter !== 'all' 
                  ? 'Try modifying your search query or transaction filters'
                  : isExpert 
                    ? 'Your earned client booking payments and payout histories will appear here.'
                    : 'Your card deposits, payouts, and query call payments will appear here.'}
              </Text>
            </View>
          ) : (
            Object.keys(groupedTxs).map((groupName) => (
              <View key={groupName} className="mb-5">
                <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 ml-1">
                  {groupName}
                </Text>
                
                {groupedTxs[groupName].map((tx) => {
                  const isPositive = tx.amount > 0;
                  const isPending = tx.status === 'pending';
                  const isFailed = tx.status === 'failed';
                  
                  return (
                    <TouchableOpacity
                      key={tx._id}
                      onPress={() => handleTxPress(tx)}
                      activeOpacity={0.7}
                      className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <View className={`p-2.5 rounded-xl mr-3 ${
                          isFailed 
                            ? 'bg-rose-500/10'
                            : isPending 
                              ? 'bg-amber-500/10'
                              : isPositive 
                                ? 'bg-emerald-500/10 border border-emerald-500/20' 
                                : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850'
                        }`}>
                          {isFailed ? (
                            <X size={16} color="#ef4444" />
                          ) : isPositive ? (
                            <ArrowDownLeft size={16} color="#10b981" />
                          ) : (
                            <ArrowUpRight size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text 
                            className={`text-slate-900 dark:text-white font-semibold text-sm ${isFailed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`} 
                            numberOfLines={1}
                          >
                            {tx.description}
                          </Text>
                          <Text className="text-slate-500 dark:text-slate-400 text-[9px] uppercase mt-0.5 font-bold tracking-wide">
                            {tx.type} • {isPending ? 'Pending hold' : tx.status}
                          </Text>
                        </View>
                      </View>

                      <Text className={`font-black text-sm ${
                        isFailed 
                          ? 'text-slate-400 line-through'
                          : isPending 
                            ? 'text-amber-500'
                            : isPositive 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-900 dark:text-white'
                      }`}>
                        {isPositive && !isFailed ? '+' : ''}
                        ₦{tx.amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}

          {/* Load More Button */}
          {hasMore && (
            <TouchableOpacity
              onPress={handleLoadMore}
              disabled={isLoading}
              className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 rounded-2xl items-center mt-2"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text className="text-primary-500 font-extrabold text-sm">Load Older Transactions</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Deposit Amount Input Preset Modal */}
      <DepositModal
        visible={depositVisible}
        onClose={() => setDepositVisible(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        onSuccess={() => loadData(true)}
        availableBalance={availableBalance}
      />

      {/* Detail Breakdown View Modal */}
      <TransactionDetailModal
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedTx(null);
        }}
        transaction={selectedTx}
      />
    </View>
  );
}
