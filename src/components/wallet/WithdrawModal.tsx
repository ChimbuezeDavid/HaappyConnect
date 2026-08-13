/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, ArrowDownRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useWalletStore } from '@/store/walletStore';

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
}

export default function WithdrawModal({ visible, onClose, onSuccess, availableBalance }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const { withdrawFunds, isActionLoading } = useWalletStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const numericAmount = parseFloat(amount.replace(/,/g, ''));
  const isAmountValid = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= availableBalance;
  const isAccountNumberValid = accountNumber.trim().length === 10;
  const isBankNameValid = bankName.trim().length > 0;
  const isAccountNameValid = accountName.trim().length > 0;
  
  const isFormValid = isAmountValid && isAccountNumberValid && isBankNameValid && isAccountNameValid;
  const flatFee = 50;
  const netSettlement = isAmountValid && numericAmount > flatFee ? numericAmount - flatFee : 0;

  useEffect(() => {
    if (visible) {
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
    }
  }, [visible]);

  const handleWithdraw = async () => {
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (numericAmount > availableBalance) {
      Alert.alert('Insufficient Balance', `You can only withdraw up to ₦${availableBalance.toLocaleString()}.`);
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all bank details.');
      return;
    }

    try {
      await withdrawFunds({
        amount: numericAmount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      });
      Alert.alert('Payout Initiated', `Your request to withdraw ₦${numericAmount.toLocaleString()} has been submitted.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Withdrawal request failed.');
    }
  };

  const setAmountPercentage = (pct: number) => {
    const val = Math.floor(availableBalance * pct);
    setAmount(val.toString());
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={onClose} />
          
          <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6 pb-10 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text className="text-xl font-extrabold text-slate-900 dark:text-white">Withdraw Funds</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Transfer your earnings to a bank account</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                  <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Balance Bar */}
              <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5 flex-row justify-between items-center">
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Available to Withdraw</Text>
                <Text className="text-lg font-black text-emerald-600 dark:text-emerald-400">₦{availableBalance.toLocaleString()}</Text>
              </View>

              {/* Amount Input */}
              <Text className="text-xs font-semibold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-2">Amount</Text>
              <View className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-2 flex-row items-center">
                <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mr-2">₦</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                  className="flex-1 text-2xl font-extrabold text-slate-900 dark:text-white p-0"
                />
              </View>

              {/* Amount Warnings */}
              {amount.length > 0 && !isAmountValid && (
                <Text className="text-xs text-red-500 font-semibold mb-4 ml-1">
                  {numericAmount > availableBalance
                    ? `Amount exceeds available balance of ₦${availableBalance.toLocaleString()}`
                    : 'Please enter a valid amount greater than zero'}
                </Text>
              )}

              {/* Percentages */}
              <View className="flex-row gap-2 mb-5">
                {[0.25, 0.5, 0.75, 1].map((val) => {
                  const isSelected = Math.abs(parseFloat(amount) - Math.floor(availableBalance * val)) < 1.0;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAmountPercentage(val)}
                      className={`flex-1 border py-2.5 rounded-xl items-center ${
                        isSelected
                          ? 'bg-primary-500/10 border-primary-500 dark:bg-primary-500/15'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Text className={`font-bold text-xs ${
                        isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300'
                      }`}>
                        {val * 100}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Settlement Summary breakdown */}
              {isAmountValid && (
                <View className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5">
                  <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
                    Settlement Summary
                  </Text>
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Requested Amount</Text>
                    <Text className="text-slate-900 dark:text-white font-bold text-xs">₦{numericAmount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Processing Fee</Text>
                    <Text className="text-slate-900 dark:text-white font-bold text-xs">₦{flatFee.toLocaleString()}.00</Text>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-200/50 dark:border-slate-850/50 pt-2 mt-1">
                    <Text className="text-slate-900 dark:text-white text-xs font-extrabold">Net Payout Settlement</Text>
                    <Text className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₦{netSettlement.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {/* Bank Details */}
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Destination Account</Text>
              
              <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Bank Name</Text>
                  <TextInput
                    placeholder="e.g. GTBank, Access Bank"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    value={bankName}
                    onChangeText={setBankName}
                    className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm"
                  />
                </View>

                <View className="mt-3">
                  <Text className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Account Number</Text>
                  <TextInput
                    keyboardType="numeric"
                    maxLength={10}
                    placeholder="10-digit account number"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    value={accountNumber}
                    onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, ''))}
                    className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm"
                  />
                  {accountNumber.length > 0 && !isAccountNumberValid && (
                    <Text className="text-[11px] text-red-500 font-semibold mt-1.5 ml-1">
                      Account number must be exactly 10 digits (currently {accountNumber.length})
                    </Text>
                  )}
                </View>

                <View className="mt-3">
                  <Text className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Account Holder Name</Text>
                  <TextInput
                    placeholder="Full name on bank account"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    value={accountName}
                    onChangeText={setAccountName}
                    className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={isActionLoading || !isFormValid}
                className={`w-full py-4.5 rounded-2xl flex-row justify-center items-center ${
                  !isFormValid
                    ? 'bg-slate-200 dark:bg-slate-800 opacity-60'
                    : isActionLoading
                      ? 'bg-primary-500/80'
                      : 'bg-primary-500 shadow-lg shadow-primary-500/20'
                }`}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <ArrowDownRight size={18} color="#fff" className="mr-2" />
                    <Text className="text-white font-extrabold text-base ml-2">Request Withdrawal</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
