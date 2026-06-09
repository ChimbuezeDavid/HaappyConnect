import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Pressable } from 'react-native';
import { X, CreditCard } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useWalletStore } from '@/store/walletStore';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

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

  const handleDeposit = async () => {
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount greater than zero.');
      return;
    }

    try {
      const redirectUri = Linking.createURL('wallet-callback');
      const data = await depositFunds(numericAmount, redirectUri);
      
      if (data && data.authorizationUrl) {
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
            Alert.alert('Payment Declined', 'The transaction was cancelled or failed.');
          }
        } else {
          // If the browser was closed before completing
          Alert.alert('Payment Pending', 'Checkout session was closed. We will verify transactions shortly.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initialize deposit.');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        
        <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6 pb-10 border-t border-slate-200 dark:border-slate-800 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-xl font-extrabold text-slate-900 dark:text-white">Deposit Funds</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Credit your wallet securely</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
            >
              <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5 flex-row items-center">
            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mr-2">₦</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
              value={amount}
              onChangeText={(text) => {
                // Remove formatting characters if user edits
                const clean = text.replace(/[^0-9.]/g, '');
                setAmount(clean);
              }}
              className="flex-1 text-3xl font-extrabold text-slate-900 dark:text-white p-0"
              style={{ textAlignVertical: 'center' }}
            />
          </View>

          {/* Presets */}
          <Text className="text-xs font-semibold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-3">Quick Presets</Text>
          <View className="flex-row flex-wrap gap-2.5 mb-6">
            {presets.map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setAmount(val.toString())}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 py-3 px-4 rounded-xl"
              >
                <Text className="text-slate-850 dark:text-slate-200 font-bold text-sm">
                  ₦{val.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={isActionLoading}
            className={`w-full py-4.5 rounded-2xl flex-row justify-center items-center ${
              isActionLoading ? 'bg-primary-500/80' : 'bg-primary-500'
            }`}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <CreditCard size={18} color="#fff" className="mr-2" />
                <Text className="text-white font-extrabold text-base ml-2">Proceed to Checkout</Text>
              </>
            )}
          </TouchableOpacity>

          <Text className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-normal">
            Transactions are processed through Paystack. By clicking proceed, you agree to our payment terms.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
