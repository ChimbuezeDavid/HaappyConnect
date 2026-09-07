import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { MessageSquare, Video, ShieldCheck, Sparkles, HelpCircle, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppScreen from '@/components/ui/AppScreen';
import { useAuthStore } from '@/store/authStore';

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

  // Form states: support Written text and Video consultations
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

  const textPrice = expert?.textQuestionPrice || 0;
  const videoPrice = expert?.videoResponsePrice || 0;
  const currentPrice = type === 'text' ? textPrice : videoPrice;

  const handleSubmit = async () => {
    if (!seekerContent.trim()) {
      Alert.alert('Validation Error', 'Please enter your question details.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/question', {
        expertId: expertUserId,
        type,
        seekerContent,
      });
      Alert.alert('Question Submitted', 'Your question has been sent and funds placed in escrow. The expert has 72 hours to respond.', [
        {
          text: 'View Consultation',
          onPress: () => {
            router.replace({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any);
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Server error submitting question');
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
              <Sparkles size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-display font-bold text-base">
                Send Question (₦{currentPrice.toLocaleString()})
              </Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      {/* Single Unified Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3"
        >
          <ChevronLeft size={22} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-display font-black text-slate-900 dark:text-white">
            Ask Consultation
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            Targeted advice & professional review
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

      {/* Select Response Format (Balanced 2-Card Grid) */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
        Select Consultation Format
      </Text>
      <View className="flex-row mb-6 gap-3">
        {/* Written Response */}
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
            Written Review
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-snug">
            In-depth written analysis delivered within 72h.
          </Text>
        </TouchableOpacity>

        {/* Video Response */}
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
          <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-snug">
            Personalized video reply explaining your answer.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Question Details Input */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
            Your Question Details *
          </Text>
          <Text className="text-slate-400 text-xs">{seekerContent.length} chars</Text>
        </View>
        <TextInput
          value={seekerContent}
          onChangeText={setSeekerContent}
          placeholder="Provide context, challenges you face, or specific questions so the mentor can give tailored advice..."
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
            Escrow Protection Guarantee
          </Text>
          <Text className="text-emerald-800 dark:text-emerald-400/90 text-xs mt-1 leading-relaxed">
            Your payment of ₦{currentPrice.toLocaleString()} will be held securely in escrow. Funds are only released after the expert delivers their answer. If unanswered within 72 hours, your wallet is automatically refunded.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
