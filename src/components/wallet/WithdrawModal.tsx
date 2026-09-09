/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList,
} from 'react-native';
import {
  X,
  ArrowDownRight,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useWalletStore } from '@/store/walletStore';
import { api } from '@/lib/api';

interface BankItem {
  name: string;
  code: string;
  slug?: string;
}

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
}

export default function WithdrawModal({
  visible,
  onClose,
  onSuccess,
  availableBalance,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');

  // Bank directory and picker modal
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);

  // NIBSS resolution states
  const [isResolvingName, setIsResolvingName] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isNameVerified, setIsNameVerified] = useState(false);

  const { withdrawFunds, isActionLoading } = useWalletStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const formatWithCommas = (text: string): string => {
    const clean = text.replace(/[^0-9.]/g, '');
    if (!clean) return '';
    const parts = clean.split('.');
    const integerPart = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '';
    if (parts.length > 1) {
      return `${integerPart}.${parts[1].slice(0, 2)}`;
    }
    return integerPart;
  };

  const numericAmount = parseFloat(amount.replace(/,/g, ''));
  const isAmountEntered = !isNaN(numericAmount) && numericAmount > 0;
  const isAmountValid = isAmountEntered && numericAmount <= availableBalance;
  const isAccountNumberValid = accountNumber.trim().length === 10;
  const isBankSelected = bankCode.trim().length > 0;

  const isFormValid =
    isAmountValid && isAccountNumberValid && isBankSelected && isNameVerified && accountName.trim().length > 0;
  const flatFee = 50;
  const netSettlement =
    isAmountValid && numericAmount > flatFee ? numericAmount - flatFee : 0;

  // Load banks list on open
  useEffect(() => {
    if (visible) {
      setAmount('');
      setAccountNumber('');
      setBankName('');
      setBankCode('');
      setAccountName('');
      setIsNameVerified(false);
      setResolutionError(null);

      // Fetch banks
      const loadBanks = async () => {
        setIsLoadingBanks(true);
        try {
          const res = await api.get('/wallet/banks');
          if (res?.banks && Array.isArray(res.banks)) {
            setBanks(res.banks);
          }
        } catch (err) {
          console.warn('Failed to load banks directory', err);
        } finally {
          setIsLoadingBanks(false);
        }
      };
      loadBanks();
    }
  }, [visible]);

  // Live NIBSS Name Resolution trigger
  useEffect(() => {
    if (isAccountNumberValid && isBankSelected) {
      let isCurrent = true;
      setIsResolvingName(true);
      setResolutionError(null);
      setIsNameVerified(false);
      setAccountName('');

      const resolveTimeout = setTimeout(async () => {
        try {
          const res = await api.get(`/wallet/resolve-account?account_number=${encodeURIComponent(accountNumber.trim())}&bank_code=${encodeURIComponent(bankCode)}`);
          if (isCurrent && res && res.accountName) {
            setAccountName(res.accountName);
            setIsNameVerified(true);
            setResolutionError(null);
          }
        } catch (err: any) {
          if (isCurrent) {
            setIsNameVerified(false);
            setResolutionError(err.message || 'Could not verify account name with NIBSS');
          }
        } finally {
          if (isCurrent) {
            setIsResolvingName(false);
          }
        }
      }, 350); // slight debounce

      return () => {
        isCurrent = false;
        clearTimeout(resolveTimeout);
      };
    } else {
      setIsNameVerified(false);
      setAccountName('');
      setResolutionError(null);
    }
  }, [accountNumber, bankCode, isAccountNumberValid, isBankSelected]);

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return banks;
    const q = bankSearch.toLowerCase();
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, bankSearch]);

  const handleWithdraw = async () => {
    if (!isAmountEntered) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (numericAmount > availableBalance) {
      Alert.alert(
        'Insufficient Balance',
        `You can only withdraw up to ₦${availableBalance.toLocaleString()}.`
      );
      return;
    }

    if (!isAccountNumberValid || !isBankSelected || !isNameVerified) {
      Alert.alert('Incomplete Bank Verification', 'Please ensure your account number and bank are verified.');
      return;
    }

    try {
      await withdrawFunds({
        amount: numericAmount,
        bankName: bankName.trim(),
        bankCode: bankCode.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });
      Alert.alert(
        'Payout Dispatched',
        `Your withdrawal of ₦${numericAmount.toLocaleString()} has been queued for bank transfer to ${accountName}.`
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Withdrawal Failed', error.message || 'Unable to process withdrawal request.');
    }
  };

  const setAmountPercentage = (pct: number) => {
    const val = Math.floor(availableBalance * pct);
    setAmount(val.toLocaleString('en-US'));
  };

  const getButtonText = () => {
    if (isActionLoading) return 'Processing Transfer...';
    if (!isAmountEntered) return 'Enter Withdrawal Amount';
    if (numericAmount > availableBalance) return 'Amount Exceeds Balance';
    if (!isAccountNumberValid) return 'Enter 10-Digit Account Number';
    if (!isBankSelected) return 'Select Destination Bank';
    if (isResolvingName) return 'Verifying Account Name...';
    if (!isNameVerified) return 'Invalid Account Details';
    return `Withdraw ₦${numericAmount.toLocaleString()}`;
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center items-center"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          className="bg-black/60 dark:bg-black/80"
          onPress={onClose}
        />

        <View
          style={{
            maxHeight: Platform.OS === 'web' ? ('90vh' as any) : '90%',
          }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-11/12 overflow-hidden flex-col"
        >
          {/* 1. FIXED HEADER */}
          <View className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex-row justify-between items-center bg-white dark:bg-slate-900">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-black text-slate-900 dark:text-white">
                  Withdraw Funds
                </Text>
                <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Bank Payout
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Direct settlement to your Nigerian bank account
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* 2. CONTENT-AWARE SCROLLABLE BODY */}
          <ScrollView
            className="flex-1 px-6 py-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Available Balance Pill */}
            <View className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 mb-4 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <ShieldCheck size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Available for Payout
                </Text>
              </View>
              <Text className="text-base font-black text-emerald-600 dark:text-emerald-400">
                ₦{availableBalance.toLocaleString()}
              </Text>
            </View>

            {/* Step A: Amount Section with Thousands Separator */}
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Withdrawal Amount
              </Text>
              <View
                className={`bg-slate-50 dark:bg-slate-800/60 border rounded-2xl px-4 py-3 flex-row items-center ${
                  amount.length > 0 && !isAmountValid
                    ? 'border-red-500/80'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Text className="text-2xl font-black text-primary-600 dark:text-primary-400 mr-2">₦</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={amount}
                  onChangeText={(text) => setAmount(formatWithCommas(text))}
                  className="flex-1 text-2xl font-black text-slate-900 dark:text-white p-0"
                />
              </View>

              {amount.length > 0 && !isAmountValid && (
                <View className="flex-row items-center mt-1.5 ml-1">
                  <AlertCircle size={12} color="#EF4444" style={{ marginRight: 4 }} />
                  <Text className="text-[11px] text-red-500 font-semibold">
                    {numericAmount > availableBalance
                      ? `Exceeds available balance of ₦${availableBalance.toLocaleString()}`
                      : 'Enter an amount greater than ₦0'}
                  </Text>
                </View>
              )}

              {/* Quick Percentages Chips */}
              <View className="flex-row gap-2 mt-2.5">
                {[
                  { label: '25%', val: 0.25 },
                  { label: '50%', val: 0.5 },
                  { label: '75%', val: 0.75 },
                  { label: 'Max', val: 1.0 },
                ].map((item) => {
                  const targetVal = Math.floor(availableBalance * item.val);
                  const isSelected =
                    amount.length > 0 && Math.abs(numericAmount - targetVal) < 1.0;

                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => setAmountPercentage(item.val)}
                      activeOpacity={0.8}
                      className={`flex-1 border py-2 rounded-xl items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          isSelected
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Settlement Breakdown Summary */}
            {isAmountValid && (
              <View className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 mb-4">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Payout Breakdown
                </Text>
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">
                    Gross Withdrawal
                  </Text>
                  <Text className="text-slate-900 dark:text-white font-bold text-xs">
                    ₦{numericAmount.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">
                    NIP Transfer Fee
                  </Text>
                  <Text className="text-slate-900 dark:text-white font-bold text-xs">
                    ₦{flatFee.toLocaleString()}.00
                  </Text>
                </View>
                <View className="flex-row justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                  <Text className="text-slate-900 dark:text-white text-xs font-black">
                    Net Deposit to Bank
                  </Text>
                  <Text className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    ₦{netSettlement.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {/* Destination Bank Account Fields in Sequence */}
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Building2 size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 6 }} />
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Destination Bank Account
                </Text>
              </View>

              {/* 1. Account Number (NUBAN) with 10-digit counter */}
              <View className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    1. Account Number (NUBAN)
                  </Text>
                  <View className="flex-row items-center">
                    {isAccountNumberValid ? (
                      <View className="flex-row items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 size={11} color="#059669" style={{ marginRight: 3 }} />
                        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          10 Digits
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-[10px] font-bold text-slate-400">
                        {accountNumber.length}/10 digits
                      </Text>
                    )}
                  </View>
                </View>
                <TextInput
                  keyboardType="numeric"
                  maxLength={10}
                  placeholder="Enter 10-digit NUBAN"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={accountNumber}
                  onChangeText={(text) => {
                    setAccountNumber(text.replace(/[^0-9]/g, ''));
                  }}
                  className={`bg-slate-50 dark:bg-slate-800/60 border rounded-xl px-3.5 py-3 text-slate-900 dark:text-white text-sm ${
                    accountNumber.length > 0 && !isAccountNumberValid
                      ? 'border-amber-500/70'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </View>

              {/* 2. Bank Name (Searchable Select Option) */}
              <View className="mb-3">
                <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">
                  2. Select Bank
                </Text>
                <TouchableOpacity
                  onPress={() => setBankPickerVisible(true)}
                  activeOpacity={0.75}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 flex-row items-center justify-between"
                >
                  <Text
                    className={`text-sm ${
                      bankName ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    numberOfLines={1}
                  >
                    {bankName || 'Choose your Nigerian bank...'}
                  </Text>
                  <ChevronDown size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>

              {/* 3. Account Name (Auto-resolved via NIBSS) */}
              <View className="mb-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    3. Registered Account Name
                  </Text>
                  {isNameVerified && (
                    <View className="flex-row items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      <ShieldCheck size={11} color="#059669" style={{ marginRight: 3 }} />
                      <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        NIBSS Verified
                      </Text>
                    </View>
                  )}
                </View>

                {isResolvingName ? (
                  <View className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 flex-row items-center">
                    <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                    <Text className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Verifying account name with NIBSS...
                    </Text>
                  </View>
                ) : (
                  <View
                    className={`bg-slate-50 dark:bg-slate-800/60 border rounded-xl px-3.5 py-3 ${
                      isNameVerified
                        ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/5'
                        : resolutionError
                        ? 'border-red-500/40'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isNameVerified
                          ? 'text-slate-900 dark:text-white font-extrabold uppercase tracking-wide'
                          : 'text-slate-400 dark:text-slate-500 italic'
                      }`}
                      numberOfLines={1}
                    >
                      {accountName || (isAccountNumberValid && isBankSelected ? 'Account verification pending' : 'Auto-retrieved after selecting bank')}
                    </Text>
                  </View>
                )}

                {resolutionError && (
                  <View className="flex-row items-center mt-1.5 ml-1">
                    <AlertCircle size={12} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] text-red-500 font-semibold">
                      {resolutionError}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* 3. STICKY FOOTER CTA */}
          <View className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={isActionLoading || !isFormValid}
              activeOpacity={0.85}
              className={`w-full py-3.5 rounded-2xl flex-row justify-center items-center ${
                !isFormValid
                  ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 opacity-70'
                  : isActionLoading
                  ? 'bg-emerald-600/80'
                  : 'bg-emerald-600 shadow-md shadow-emerald-600/20'
              }`}
            >
              {isActionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <ArrowDownRight
                    size={16}
                    color={isFormValid ? '#fff' : isDark ? '#64748b' : '#94a3b8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-black text-sm ${
                      isFormValid
                        ? 'text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {getButtonText()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. SEARCHABLE BANK SELECTOR MODAL */}
        <Modal
          visible={bankPickerVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBankPickerVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setBankPickerVisible(false)} />
            <View
              style={{ maxHeight: '80%' }}
              className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-black text-slate-900 dark:text-white">
                  Select Nigerian Bank
                </Text>
                <TouchableOpacity
                  onPress={() => setBankPickerVisible(false)}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                  <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>

              {/* Search Box */}
              <View className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-4 py-2.5 flex-row items-center mb-4 border border-slate-200/80 dark:border-slate-700/80">
                <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search bank name (e.g. Kuda, OPay, GTBank)..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  value={bankSearch}
                  onChangeText={setBankSearch}
                  className="flex-1 text-sm font-semibold text-slate-900 dark:text-white p-0"
                  autoFocus
                />
                {bankSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setBankSearch('')}>
                    <X size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Banks List */}
              {isLoadingBanks ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="small" color="#059669" />
                  <Text className="text-xs text-slate-400 mt-2">Loading bank directory...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = bankCode === item.code;
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setBankName(item.name);
                          setBankCode(item.code);
                          setBankPickerVisible(false);
                          setBankSearch('');
                        }}
                        activeOpacity={0.7}
                        className={`py-3.5 px-4 rounded-2xl flex-row justify-between items-center mb-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            isSelected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.name}
                        </Text>
                        {isSelected && <Check size={16} color="#059669" />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View className="py-8 items-center">
                      <Text className="text-xs text-slate-400">No bank found matching "{bankSearch}"</Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}
