import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { MessageSquare, Mic, Video, ShieldAlert, Sparkles, HelpCircle, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppScreen from '@/components/ui/AppScreen';

export default function AskQuestionModal() {
  const { expertId, initialType } = useLocalSearchParams<{ expertId: string; initialType?: string }>();
  const router = useRouter();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [expertUserId, setExpertUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states: support text, voice, and video
  const [type, setType] = useState<'text' | 'voice' | 'video'>(
    initialType === 'video' ? 'video' : initialType === 'voice' ? 'voice' : 'text'
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
      } catch (err) {
        console.error('Error fetching expert:', err);
        Alert.alert('Error', 'Expert not found');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetails();
  }, [expertId]);

  const textPrice = expert?.textQuestionPrice || 0;
  const videoPrice = expert?.videoResponsePrice || 0;
  // Voice memo pricing: defaults to videoResponsePrice or 1.5x text question rate
  const voicePrice = videoPrice > 0 ? Math.round(videoPrice * 0.75) : Math.round(textPrice * 1.5);
  
  const currentPrice = type === 'text' ? textPrice : type === 'voice' ? voicePrice : videoPrice;

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
      <View className="flex-1 bg-alabaster dark:bg-obsidian justify-center items-center">
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
      {/* Back button and title */}
      <View className="flex-row items-center mb-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3"
        >
          <ChevronLeft size={20} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <Text className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Ask Consultation
        </Text>
      </View>

      {/* Target Expert Summary Card */}
      {expert && (
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 mb-6 flex-row items-center shadow-sm">
          <View className="w-10 h-10 rounded-2xl bg-primary-500/10 items-center justify-center mr-3">
            <HelpCircle size={22} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Consulting With
            </Text>
            <Text className="text-slate-900 dark:text-white font-display font-bold text-base mt-0.5">
              {expert.fullName}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-sans" numberOfLines={1}>
              {expert.headline}
            </Text>
          </View>
        </View>
      )}

      {/* Select Response Format */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
        Select Response Format
      </Text>
      <View className="flex-row mb-6 space-x-2.5">
        {/* Text Response */}
        <TouchableOpacity
          onPress={() => setType('text')}
          className={`flex-1 p-3.5 rounded-2xl border items-center justify-center mr-2 ${
            type === 'text'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <MessageSquare size={20} color={type === 'text' ? '#059669' : '#64748b'} />
          <Text className={`font-bold mt-2 text-xs text-center ${type === 'text' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
            Written
          </Text>
          <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-1">
            ₦{textPrice.toLocaleString()}
          </Text>
        </TouchableOpacity>

        {/* Voice Note Memo */}
        <TouchableOpacity
          onPress={() => setType('voice')}
          className={`flex-1 p-3.5 rounded-2xl border items-center justify-center mr-2 ${
            type === 'voice'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <Mic size={20} color={type === 'voice' ? '#059669' : '#64748b'} />
          <Text className={`font-bold mt-2 text-xs text-center ${type === 'voice' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
            Voice Memo
          </Text>
          <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-1">
            ₦{voicePrice.toLocaleString()}
          </Text>
        </TouchableOpacity>

        {/* Video Consultation */}
        <TouchableOpacity
          onPress={() => setType('video')}
          className={`flex-1 p-3.5 rounded-2xl border items-center justify-center ${
            type === 'video'
              ? 'bg-primary-500/10 border-primary-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <Video size={20} color={type === 'video' ? '#059669' : '#64748b'} />
          <Text className={`font-bold mt-2 text-xs text-center ${type === 'video' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
            Video
          </Text>
          <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-1">
            ₦{videoPrice.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Question Details Input */}
      <View className="mb-6">
        <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
          Your Question Details
        </Text>
        <TextInput
          value={seekerContent}
          onChangeText={setSeekerContent}
          placeholder="Provide clear details and context so the expert can offer targeted advice..."
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          multiline
          numberOfLines={6}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-slate-900 dark:text-white text-base font-sans min-h-[140px]"
          style={{ textAlignVertical: 'top' }}
        />
      </View>

      {/* Escrow Guarantee Card */}
      <View className="flex-row items-start bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl mb-8">
        <ShieldAlert size={20} color="#059669" style={{ marginTop: 2 }} />
        <View className="flex-1 ml-3">
          <Text className="text-emerald-900 dark:text-emerald-300 font-bold text-xs">
            Escrow Protection Guarantee
          </Text>
          <Text className="text-emerald-800 dark:text-emerald-400/80 text-[11px] mt-1 leading-relaxed">
            Your payment of ₦{currentPrice.toLocaleString()} will be held securely in escrow. The expert only receives funds after providing their response. If unanswered after 72 hours, your wallet is refunded immediately.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
