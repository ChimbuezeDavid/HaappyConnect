import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { MessageSquare, Video, ShieldCheck, HelpCircle, ChevronLeft, Clock, Lock, CheckCircle2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppScreen from '@/components/ui/AppScreen';
import { useAuthStore } from '@/store/authStore';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure any opened auth session can complete on web or mobile
WebBrowser.maybeCompleteAuthSession();

export default function AskQuestionModal() {
  const { expertId, initialType } = useLocalSearchParams<{ expertId: string; initialType?: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [expertUserId, setExpertUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states: Written text package or Video breakdown package
  const [type, setType] = useState<'text' | 'video'>(
    initialType === 'video' ? 'video' : 'text'
  );
  const [seekerContent, setSeekerContent] = useState('');

  useEffect(() => {
    const fetchExpertDetails = async () => {
      if (!expertId) return;
      setIsLoading(true);
      try {
        const data = await api.get(`/expert/${expertId}`);
        setExpert(data);
        const uid = typeof data.user === 'string' ? data.user : data.user?._id || data.user?.id || '';
        setExpertUserId(uid);

        // Self-consultation check
        const currentUserId = user?.id || (user as any)?._id;
        if (currentUserId && uid && currentUserId.toString() === uid.toString()) {
          Alert.alert(
            'Self-Consultation Restricted',
            'You cannot submit questions or book consultations with your own profile.',
            [{ text: 'Go Back', onPress: () => router.back() }]
          );
        }
      } catch (err) {
        console.error('Error fetching expert:', err);
        Alert.alert('Error', 'Expert not found');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetails();
  }, [expertId, user]);

  // Package pricing and terms configured by the expert
  const textPrice = expert?.textPackagePrice || expert?.textQuestionPrice || 3000;
  const textCount = expert?.textPackageCount || 3;
  const videoPrice = expert?.videoPackagePrice || expert?.videoResponsePrice || 5000;
  const videoCount = expert?.videoPackageCount || 1;
  const turnaroundDays = expert?.responseWindowDays || 3;

  const currentPrice = type === 'text' ? textPrice : videoPrice;
  const currentCount = type === 'text' ? textCount : videoCount;

  const handleSubmit = async () => {
    if (!seekerContent.trim()) {
      Alert.alert('Validation Error', 'Please enter your question or advisory brief.');
      return;
    }

    setSubmitting(true);
    try {
      const redirectUri = Linking.createURL('consultation-callback');
      const initiateData = await api.post('/question/initiate', {
        expertId: expertUserId,
        type,
        seekerContent: seekerContent.trim(),
        redirect_uri: redirectUri,
      });

      if (!initiateData?.authorizationUrl) {
        throw new Error('Payment initialization failed. Please try again.');
      }

      // Web platform checkout flow
      if (Platform.OS === 'web') {
        if (initiateData.isMock) {
          const verifyRes = await api.post('/question/verify-payment', { reference: initiateData.reference });
          router.replace({
            pathname: '/chat/[conversationId]',
            params: { conversationId: verifyRes.conversationId || initiateData.conversationId }
          });
          return;
        }
        window.location.href = initiateData.authorizationUrl;
        return;
      }

      // Mobile Native checkout flow
      const result = await WebBrowser.openAuthSessionAsync(initiateData.authorizationUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const ref = (parsed.queryParams?.reference || parsed.queryParams?.trxref || initiateData.reference) as string;
        const verifyRes = await api.post('/question/verify-payment', { reference: ref });
        router.replace({
          pathname: '/chat/[conversationId]',
          params: { conversationId: verifyRes.conversationId || initiateData.conversationId }
        });
      } else {
        // Fallback check if reference was completed
        try {
          const verifyRes = await api.post('/question/verify-payment', { reference: initiateData.reference });
          if (verifyRes?.success) {
            router.replace({
              pathname: '/chat/[conversationId]',
              params: { conversationId: verifyRes.conversationId || initiateData.conversationId }
            });
            return;
          }
        } catch (_) {}
        Alert.alert('Checkout Incomplete', 'Payment session was closed before completion. You can retry at any time.');
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Server error initiating consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs mt-3">Loading expert details...</Text>
      </View>
    );
  }

  return (
    <AppScreen
      scrollable
      className="px-6 pt-4"
      bottomAction={
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !seekerContent.trim()}
          className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${
            !seekerContent.trim() ? 'bg-primary-500/40' : 'bg-primary-500 shadow-primary-500/20'
          }`}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Lock size={17} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-display font-bold text-base">
                Pay ₦{currentPrice.toLocaleString()} & Open Thread
              </Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3"
        >
          <ChevronLeft size={22} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-display font-black text-slate-900 dark:text-white">
            Book Consultation
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            One-tap direct escrow checkout & lifetime thread
          </Text>
        </View>
      </View>

      {/* Target Expert Summary Card */}
      {expert && (
        <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 mb-6 flex-row items-center shadow-sm dark:shadow-none">
          <View className="w-12 h-12 rounded-2xl bg-primary-500/10 items-center justify-center mr-3.5">
            <HelpCircle size={24} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Consulting With
            </Text>
            <Text className="text-slate-900 dark:text-white font-display font-bold text-base mt-0.5">
              {expert.fullName}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-sans mt-0.5" numberOfLines={1}>
              {expert.headline || 'Verified Industry Mentor'}
            </Text>
          </View>
        </View>
      )}

      {/* Consultation Package Selector */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
          Select Advisory Package
        </Text>
        <View className="flex-row items-center">
          <Clock size={12} color="#059669" style={{ marginRight: 4 }} />
          <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            {turnaroundDays}-day response window
          </Text>
        </View>
      </View>

      <View className="flex-row mb-6 gap-3">
        {/* Written Advisory Package */}
        <TouchableOpacity
          onPress={() => setType('text')}
          activeOpacity={0.85}
          className={`flex-1 p-4 rounded-2xl border ${
            type === 'text'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className={`p-2 rounded-xl ${type === 'text' ? 'bg-primary-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <MessageSquare size={18} color={type === 'text' ? '#059669' : '#64748b'} />
            </View>
            <Text className="text-primary-600 dark:text-primary-400 font-black text-sm">
              ₦{textPrice.toLocaleString()}
            </Text>
          </View>
          <Text className="font-bold text-sm text-slate-900 dark:text-white">
            Written Advisory
          </Text>
          <View className="flex-row items-center mt-1">
            <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
            <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
              {textCount} Questions Total
            </Text>
          </View>
          <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-snug">
            Initial brief + follow-up questions in thread.
          </Text>
        </TouchableOpacity>

        {/* Video Breakdown Package */}
        <TouchableOpacity
          onPress={() => setType('video')}
          activeOpacity={0.85}
          className={`flex-1 p-4 rounded-2xl border ${
            type === 'video'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className={`p-2 rounded-xl ${type === 'video' ? 'bg-primary-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Video size={18} color={type === 'video' ? '#059669' : '#64748b'} />
            </View>
            <Text className="text-primary-600 dark:text-primary-400 font-black text-sm">
              ₦{videoPrice.toLocaleString()}
            </Text>
          </View>
          <Text className="font-bold text-sm text-slate-900 dark:text-white">
            Video Breakdown
          </Text>
          <View className="flex-row items-center mt-1">
            <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
            <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
              {videoCount} In-Depth Video
            </Text>
          </View>
          <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-snug">
            Personalized recorded breakdown answering brief.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Content Input */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
            Your Initial Inquiry Details *
          </Text>
          <Text className="text-slate-400 text-xs">{seekerContent.length} chars</Text>
        </View>
        <TextInput
          value={seekerContent}
          onChangeText={setSeekerContent}
          placeholder="Describe your question, challenges, or scenario in detail. The expert will respond directly in your dedicated knowledge thread..."
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          multiline
          numberOfLines={6}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 text-slate-900 dark:text-white text-sm font-sans min-h-[140px]"
          style={{ textAlignVertical: 'top' }}
        />
      </View>

      {/* Escrow Guarantee Card */}
      <View className="flex-row items-start bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl mb-8">
        <ShieldCheck size={20} color="#059669" style={{ marginTop: 1 }} />
        <View className="flex-1 ml-3">
          <Text className="text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
            Direct Paystack Escrow Protection
          </Text>
          <Text className="text-emerald-800 dark:text-emerald-400/90 text-xs mt-1 leading-relaxed">
            Your payment of ₦{currentPrice.toLocaleString()} is held safely in escrow. Funds are released to the mentor only upon delivering their response. If unanswered within {turnaroundDays} days, you can extend by 24 hours or claim an immediate 100% refund.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
