import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Lock, Key, Eye, EyeOff, CheckCircle2, X, AlertCircle, Mail, ArrowLeft } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useColorScheme } from 'nativewind';

interface PasswordChangeModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function PasswordChangeModal({ visible, onClose, userEmail = '' }: PasswordChangeModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Mode: 'change' (in-app change with current password) | 'reset' (forgot current, reset via 6-digit email code)
  const [mode, setMode] = useState<'change' | 'reset'>('change');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset Code state
  const [resetCode, setResetCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetCode('');
    setCodeSent(false);
    setError(null);
    setSuccess(null);
    setMode('change');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess(response.message || 'Password updated successfully!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: userEmail });
      setCodeSent(true);
      setSuccess(response.message || '6-digit code sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWithCode = async () => {
    setError(null);
    setSuccess(null);

    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: userEmail,
        code: resetCode,
        newPassword,
      });
      setSuccess(response.message || 'Password reset successfully!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center items-center bg-black/60 px-4"
      >
        <View 
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
          style={{ maxHeight: '90%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 justify-center items-center mr-3">
                <Lock size={18} color="#059669" />
              </View>
              <View>
                <Text className="text-slate-900 dark:text-white font-extrabold text-base">
                  {mode === 'change' ? 'Update Password' : 'Reset Password'}
                </Text>
                <Text className="text-slate-400 dark:text-slate-500 text-xs">
                  {mode === 'change' ? 'Security & Account Protection' : 'Recover with 6-digit Code'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 justify-center items-center"
            >
              <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Feedback Alerts */}
            {error && (
              <View className="flex-row items-center bg-red-500/10 border border-red-500/25 p-3 rounded-2xl mb-4">
                <AlertCircle size={16} color="#ef4444" className="mr-2" />
                <Text className="text-red-600 dark:text-red-400 text-xs font-semibold flex-1 ml-1.5">
                  {error}
                </Text>
              </View>
            )}

            {success && (
              <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-2xl mb-4">
                <CheckCircle2 size={16} color="#10b981" className="mr-2" />
                <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex-1 ml-1.5">
                  {success}
                </Text>
              </View>
            )}

            {mode === 'change' ? (
              /* MODE: Regular in-app change with current password */
              <View>
                {/* Current Password */}
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    Current Password
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <TextInput
                      value={currentPassword}
                      onChangeText={(t) => { setError(null); setCurrentPassword(t); }}
                      placeholder="Enter current password"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry={!showCurrent}
                      className="flex-1 text-slate-900 dark:text-white text-sm"
                    />
                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                      {showCurrent ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    New Password (Min. 6 chars)
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <TextInput
                      value={newPassword}
                      onChangeText={(t) => { setError(null); setNewPassword(t); }}
                      placeholder="Enter new password"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry={!showNew}
                      className="flex-1 text-slate-900 dark:text-white text-sm"
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                      {showNew ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View className="mb-5">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    Confirm New Password
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => { setError(null); setConfirmPassword(t); }}
                      placeholder="Confirm new password"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry={!showConfirm}
                      className="flex-1 text-slate-900 dark:text-white text-sm"
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                      {showConfirm ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 py-3.5 rounded-2xl items-center justify-center shadow-lg shadow-emerald-600/30 mb-3"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-extrabold text-sm">Save New Password</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot Current Password Option */}
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    setSuccess(null);
                    setMode('reset');
                  }}
                  className="py-2.5 items-center justify-center"
                >
                  <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    Forgot your current password? Reset with email code
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* MODE: Reset via 6-digit email code */
              <View>
                {/* Email Chip */}
                <View className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-2xl flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Mail size={14} color="#059669" />
                    <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold ml-2" numberOfLines={1}>
                      {userEmail}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSendResetCode}
                    disabled={isLoading}
                    className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl"
                  >
                    <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                      {codeSent ? 'Resend Code' : 'Send Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 6-Digit Code */}
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    6-Digit Verification Code
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <Key size={16} color="#059669" />
                    <TextInput
                      value={resetCode}
                      onChangeText={(t) => { setError(null); setResetCode(t); }}
                      placeholder="e.g. 123456"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      keyboardType="number-pad"
                      maxLength={6}
                      className="flex-1 text-slate-900 dark:text-white text-sm ml-2 font-mono tracking-widest"
                    />
                  </View>
                </View>

                {/* New Password */}
                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    New Password
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <TextInput
                      value={newPassword}
                      onChangeText={(t) => { setError(null); setNewPassword(t); }}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry={!showNew}
                      className="flex-1 text-slate-900 dark:text-white text-sm"
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-1">
                      {showNew ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm New Password */}
                <View className="mb-5">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    Confirm New Password
                  </Text>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => { setError(null); setConfirmPassword(t); }}
                      placeholder="Confirm new password"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry={!showConfirm}
                      className="flex-1 text-slate-900 dark:text-white text-sm"
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                      {showConfirm ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Reset Action */}
                <TouchableOpacity
                  onPress={handleResetWithCode}
                  disabled={isLoading || !codeSent}
                  className={`w-full py-3.5 rounded-2xl items-center justify-center mb-3 ${
                    codeSent ? 'bg-emerald-600 shadow-lg shadow-emerald-600/30' : 'bg-slate-300 dark:bg-slate-800'
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className={`font-extrabold text-sm ${codeSent ? 'text-white' : 'text-slate-500'}`}>
                      {codeSent ? 'Verify Code & Reset Password' : 'Click "Send Code" Above First'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Back to Change Password */}
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    setSuccess(null);
                    setMode('change');
                  }}
                  className="flex-row items-center justify-center py-2.5"
                >
                  <ArrowLeft size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text className="text-slate-600 dark:text-slate-400 font-bold text-xs ml-1.5">
                    Back to standard password change
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
