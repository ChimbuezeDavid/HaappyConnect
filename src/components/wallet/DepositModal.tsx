/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { X, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useWalletStore } from '@/store/walletStore';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { api } from '@/lib/api';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepositModal({ visible, onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const { depositFunds, verifyDeposit, isActionLoading } = useWalletStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const presets = [2000, 5000, 10000, 25000, 50000];

  useEffect(() => {
    if (visible) {
      setAmount('');
    }
  }, [visible]);

  const formatWithCommas = (text: string): string => {
    // Remove any character that isn't a digit or dot
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
  const isValid = !isNaN(numericAmount) && numericAmount > 0;

  const handleDeposit = async () => {
    if (!isValid) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount greater than zero.');
      return;
    }

    try {
      const redirectUri = Linking.createURL('wallet-callback');
      const data = await depositFunds(numericAmount, redirectUri);
      
      if (data && data.authorizationUrl) {
        if (Platform.OS === 'web') {
          window.location.href = data.authorizationUrl;
          return;
        }

        // Open authorization checkout session in system WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(data.authorizationUrl, redirectUri);
        
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          const { reference, status } = parsed.queryParams || {};
          
          if (status === 'success' && reference) {
            // Verify and finalize payment on backend
            await verifyDeposit(reference as string);
            Alert.alert('Deposit Successful', `₦${numericAmount.toLocaleString()} has been added to your wallet.`);
            onSuccess();
            onClose();
            setAmount('');
          } else {
            // Clean up cancelled payment record immediately from database
            if (data.reference) {
              await api.post('/wallet/cancel-pending', { reference: data.reference }).catch(() => {});
            }
            Alert.alert('Payment Cancelled', 'The checkout session was cancelled.');
          }
        } else {
          // If the browser was closed before completing, delete the pending record immediately
          if (data.reference) {
            await api.post('/wallet/cancel-pending', { reference: data.reference }).catch(() => {});
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initialize deposit.');
    }
  };

  const getButtonText = () => {
    if (isActionLoading) return 'Redirecting to Paystack...';
    if (!isValid) return 'Enter Deposit Amount';
    return `Proceed to Pay ₦${numericAmount.toLocaleString()}`;
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
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-4 py-6">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full max-h-[92%]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <Text className="text-xl font-extrabold text-slate-900 dark:text-white">Deposit Funds</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Credit your wallet securely</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                  accessibilityRole="button"
                  accessibilityLabel="Close deposit dialog"
                >
                  <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Amount Input with digit separator */}
              <View className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 mb-5 flex-row items-center">
                <Text className="text-2xl sm:text-3xl font-extrabold text-primary-600 dark:text-primary-400 mr-2">₦</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={amount}
                  onChangeText={(text) => {
                    const formatted = formatWithCommas(text);
                    setAmount(formatted);
                  }}
                  className="flex-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white p-0"
                  style={{ textAlignVertical: 'center' }}
                />
                {isValid && (
                  <View className="bg-primary-500/15 dark:bg-primary-500/20 px-2.5 py-1 rounded-full">
                    <Text className="text-[11px] font-bold text-primary-600 dark:text-primary-400">NGN</Text>
                  </View>
                )}
              </View>

              {/* Presets */}
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Quick Presets
              </Text>
              <View className="flex-row flex-wrap gap-2.5 mb-6">
                {presets.map((val) => {
                  const isSelected = numericAmount === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAmount(val.toLocaleString('en-US'))}
                      activeOpacity={0.7}
                      className={`border py-2.5 px-3.5 rounded-xl ${
                        isSelected
                          ? 'bg-primary-500/10 border-primary-500 dark:bg-primary-500/20 dark:border-primary-400'
                          : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <Text className={`font-bold text-sm ${
                        isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        ₦{val.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Pay Button */}
              <TouchableOpacity
                onPress={handleDeposit}
                disabled={isActionLoading || !isValid}
                activeOpacity={0.85}
                className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-sm ${
                  !isValid
                    ? 'bg-slate-200 dark:bg-slate-800 opacity-60'
                    : isActionLoading
                      ? 'bg-primary-500/80'
                      : 'bg-primary-500 active:bg-primary-600 shadow-primary-500/25 shadow-lg'
                }`}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <CreditCard size={18} color="#fff" />
                    <Text className="text-white font-extrabold text-base ml-2.5">
                      {getButtonText()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Security & Terms Reassurance Badge */}
              <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 items-center">
                <View className="flex-row items-center justify-center mb-1">
                  <ShieldCheck size={14} color="#059669" />
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1.5">
                    Secured by Paystack • 256-bit SSL
                  </Text>
                </View>
                <Text className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                  By proceeding, you agree to our payment terms. Funds are credited instantly to your wallet.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
