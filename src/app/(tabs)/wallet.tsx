import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Transaction } from '@/types';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';

export default function WalletScreen() {
  const { user, token, isGuest } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/wallet');
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGuest || !token) {
      setIsLoading(false);
      return;
    }
    fetchWalletData();
  }, [isGuest, token]);

  // Early return for guest mode (must be declared after all hooks)
  if (isGuest) {
    return <SignInWall />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const handleDeposit = async (amount: number) => {
    setIsDepositing(true);
    try {
      await api.post('/wallet/add-funds', { amount });
      Alert.alert('Success', `Successfully deposited ₦${amount.toLocaleString()} into your wallet.`);
      await fetchWalletData();
    } catch (err: any) {
      Alert.alert('Deposit Failed', err.message || 'Server error depositing funds');
    } finally {
      setIsDepositing(false);
    }
  };

  const isExpert = user?.role === 'expert';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955">
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 py-4 max-w-2xl w-full self-center"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        >
          {/* Balance Card */}
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6 shadow-sm dark:shadow-xl relative overflow-hidden">
            {/* Background design accents */}
            <View className="absolute right-0 bottom-0 bg-primary-500/5 dark:bg-primary-500/10 w-24 h-24 rounded-full -mr-8 -mb-8" />
            <View className="absolute left-0 top-0 bg-emerald-500/5 w-16 h-16 rounded-full -ml-4 -mt-4" />

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                {isExpert ? 'Available Balance (Earnings)' : 'Available Balance'}
              </Text>
              <View className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
                <Wallet size={20} color="#10b981" />
              </View>
            </View>

            <Text className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₦{balance.toLocaleString()}
            </Text>

            <View className="flex-row items-center mt-3">
              <ShieldCheck size={14} color="#10b981" />
              <Text className="text-slate-550 dark:text-slate-500 text-xs ml-1.5">
                Funds are secured by Haappy-Connect ledger
              </Text>
            </View>
          </View>

          {/* Quick Deposits */}
          <View className="mb-6">
            <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Add Virtual Funds</Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => handleDeposit(5000)}
                disabled={isDepositing}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3.5 rounded-2xl items-center mr-2 flex-row justify-center shadow-sm dark:shadow-none"
              >
                <Plus size={14} color={isDark ? '#fff' : '#0f172a'} />
                <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-1.5">Add ₦5,000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeposit(10000)}
                disabled={isDepositing}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3.5 rounded-2xl items-center mr-2 flex-row justify-center shadow-sm dark:shadow-none"
              >
                <Plus size={14} color={isDark ? '#fff' : '#0f172a'} />
                <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-1.5">Add ₦10,000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeposit(25000)}
                disabled={isDepositing}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center shadow-sm dark:shadow-none"
              >
                <Plus size={14} color={isDark ? '#fff' : '#0f172a'} />
                <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-1.5">Add ₦25,000</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction Ledger */}
          <View className="mb-8">
            <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">Transaction History</Text>

            {transactions.length === 0 ? (
              <View className="items-center justify-center py-12 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed shadow-sm dark:shadow-none">
                <Text className="text-slate-500 dark:text-slate-400 text-sm">No ledger transactions found</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                const formattedDate = new Date(tx.createdAt).toLocaleDateString();

                return (
                  <View
                    key={tx._id}
                    className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm dark:shadow-none"
                  >
                    <View className="flex-row items-center flex-1 mr-4">
                      <View
                        className={`p-2.5 rounded-xl mr-3 ${
                          isPositive
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft size={16} color="#10b981" />
                        ) : (
                          <ArrowUpRight size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-900 dark:text-white font-semibold text-sm" numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase mt-0.5 font-bold tracking-wide">
                          {tx.type} • {formattedDate}
                        </Text>
                      </View>
                    </View>

                    <Text className={`font-bold text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {isPositive ? '+' : ''}
                      ₦{tx.amount.toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
