import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { X, Calendar, Hash, ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Transaction } from '@/types';

interface TransactionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailModal({ visible, onClose, transaction }: TransactionDetailModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!transaction) return null;

  const isPositive = transaction.amount > 0;
  const formattedDate = new Date(transaction.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Get status color styling
  const getStatusStyle = () => {
    switch (transaction.status) {
      case 'success':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          text: 'text-emerald-600 dark:text-emerald-450',
          label: 'Successful'
        };
      case 'pending':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          text: 'text-amber-600 dark:text-amber-450',
          label: 'Pending Hold'
        };
      case 'failed':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          text: 'text-rose-600 dark:text-rose-450',
          label: 'Declined/Failed'
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          text: 'text-slate-600',
          label: transaction.status || 'Completed'
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center bg-black/70 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        
        <View className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-hidden max-w-md w-full self-center">
          {/* Close Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-extrabold text-slate-900 dark:text-white">Transaction details</Text>
            <TouchableOpacity 
              onPress={onClose}
              className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
            >
              <X size={16} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount and Status Badge */}
            <View className="items-center py-6 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <View className={`p-4 rounded-3xl mb-4 ${
                isPositive 
                  ? 'bg-emerald-500/10 border border-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800'
              }`}>
                {isPositive ? (
                  <ArrowDownLeft size={32} color="#10b981" />
                ) : (
                  <ArrowUpRight size={32} color={isDark ? '#94a3b8' : '#64748b'} />
                )}
              </View>

              <Text className={`text-3xl font-black ${
                isPositive ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-900 dark:text-white'
              }`}>
                {isPositive ? '+' : ''}₦{transaction.amount.toLocaleString()}
              </Text>

              <View className={`px-4 py-1.5 rounded-full mt-3 ${statusStyle.bg}`}>
                <Text className={`text-xs font-black uppercase tracking-wider ${statusStyle.text}`}>
                  {statusStyle.label}
                </Text>
              </View>
            </View>

            {/* General Fields */}
            <View className="space-y-4">
              <View className="flex-row justify-between py-1.5">
                <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Description</Text>
                <Text className="text-slate-900 dark:text-white font-bold text-sm text-right flex-1 ml-4">
                  {transaction.description}
                </Text>
              </View>

              <View className="flex-row justify-between py-1.5 mt-2">
                <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Transaction Type</Text>
                <Text className="text-slate-950 dark:text-slate-200 font-extrabold text-sm capitalize">
                  {transaction.type}
                </Text>
              </View>

              <View className="flex-row justify-between py-1.5 mt-2">
                <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Date & Time</Text>
                <View className="flex-row items-center">
                  <Calendar size={13} color={isDark ? '#94a3b8' : '#64748b'} className="mr-1.5" />
                  <Text className="text-slate-950 dark:text-slate-200 font-bold text-sm ml-1">
                    {formattedDate}
                  </Text>
                </View>
              </View>

              {transaction.reference && (
                <View className="flex-row justify-between py-1.5 mt-2">
                  <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Payment Reference</Text>
                  <View className="flex-row items-center">
                    <Hash size={13} color={isDark ? '#94a3b8' : '#64748b'} className="mr-1.5" />
                    <Text className="text-slate-950 dark:text-slate-200 font-mono text-xs ml-1 select-all">
                      {transaction.reference}
                    </Text>
                  </View>
                </View>
              )}

              {/* Metadata details (like Bank Transfer details for withdrawal) */}
              {transaction.metadata && transaction.metadata.bankName && (
                <View className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mt-4">
                  <View className="flex-row items-center mb-2.5">
                    <Info size={14} color="#8b5cf6" />
                    <Text className="text-xs font-extrabold text-primary-500 uppercase tracking-wider ml-1.5">
                      Payout Bank Details
                    </Text>
                  </View>
                  
                  <View className="space-y-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 dark:text-slate-450 text-[11px] font-semibold">Bank</Text>
                      <Text className="text-slate-900 dark:text-white text-[11px] font-bold">{transaction.metadata.bankName}</Text>
                    </View>
                    
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-slate-500 dark:text-slate-450 text-[11px] font-semibold">Account Number</Text>
                      <Text className="text-slate-900 dark:text-white text-[11px] font-mono font-bold">{transaction.metadata.accountNumber}</Text>
                    </View>

                    <View className="flex-row justify-between mt-1">
                      <Text className="text-slate-500 dark:text-slate-450 text-[11px] font-semibold">Account Name</Text>
                      <Text className="text-slate-900 dark:text-white text-[11px] font-bold">{transaction.metadata.accountName}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Back Button */}
            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl justify-center items-center mt-6"
            >
              <Text className="text-slate-800 dark:text-slate-200 font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
