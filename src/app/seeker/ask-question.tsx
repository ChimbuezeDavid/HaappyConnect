import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { MessageSquare, Video, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function AskQuestionModal() {
  const { expertId } = useLocalSearchParams<{ expertId: string }>();
  const router = useRouter();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states
  const [type, setType] = useState<'text' | 'video'>('text');
  const [seekerContent, setSeekerContent] = useState('');

  useEffect(() => {
    const fetchExpertDetails = async () => {
      if (!expertId) return;
      setIsLoading(true);
      try {
        const list = await api.get('/expert/discover');
        const found = list.find((p: Profile) => 
          typeof p.user === 'string' 
            ? p.user === expertId 
            : (p.user as any)?._id === expertId || (p.user as any)?.id === expertId
        );
        if (found) {
          setExpert(found);
        } else {
          Alert.alert('Error', 'Expert not found');
          router.back();
        }
      } catch (err) {
        console.error('Error fetching expert:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetails();
  }, [expertId]);

  const handleSubmit = async () => {
    if (!seekerContent.trim()) {
      Alert.alert('Validation Error', 'Please enter your question details.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/question', {
        expertId,
        type,
        seekerContent,
      });
      Alert.alert('Success', 'Your question has been sent. The expert has 72 hours to respond.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/bookings');
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
      <View className="flex-1 bg-slate-50 dark:bg-slate-955 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const textPrice = expert?.textQuestionPrice || 0;
  const videoPrice = expert?.videoResponsePrice || 0;
  const currentPrice = type === 'text' ? textPrice : videoPrice;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955">
      <ScrollView
        className="flex-1 w-full max-w-2xl self-center"
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 24, paddingTop: 24 }}
      >
      {/* Target Expert Summary */}
      {expert && (
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 flex-row items-center shadow-sm dark:shadow-none">
          <HelpCircle size={24} color="#8b5cf6" />
          <View className="ml-4 flex-1">
            <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Asking Expert</Text>
            <Text className="text-slate-900 dark:text-white font-bold text-base mt-0.5">{expert.fullName}</Text>
            <Text className="text-slate-500 dark:text-slate-500 text-xs" numberOfLines={1}>{expert.headline}</Text>
          </View>
        </View>
      )}

      {/* Select Type */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Response Format</Text>
      <View className="flex-row mb-6 space-x-4">
        {/* Text Q&A Option */}
        <TouchableOpacity
          onPress={() => setType('text')}
          className={`flex-1 bg-white dark:bg-slate-900 border p-4 rounded-2xl mr-2 items-center justify-center ${
            type === 'text' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <MessageSquare size={20} color={type === 'text' ? '#8b5cf6' : '#64748b'} />
          <Text className={`font-bold mt-2 text-sm ${type === 'text' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Text Response</Text>
          <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-sm mt-1">₦{textPrice}</Text>
        </TouchableOpacity>

        {/* Video Response Option */}
        <TouchableOpacity
          onPress={() => setType('video')}
          className={`flex-1 bg-white dark:bg-slate-900 border p-4 rounded-2xl items-center justify-center ${
            type === 'video' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <Video size={20} color={type === 'video' ? '#8b5cf6' : '#64748b'} />
          <Text className={`font-bold mt-2 text-sm ${type === 'video' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Video Response</Text>
          <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-sm mt-1">₦{videoPrice}</Text>
        </TouchableOpacity>
      </View>

      {/* Question Details Input */}
      <View className="mb-6">
        <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Write Your Question Details</Text>
        <TextInput
          value={seekerContent}
          onChangeText={setSeekerContent}
          placeholder="Be as detailed as possible so the expert can provide a comprehensive response..."
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          multiline
          numberOfLines={6}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-slate-900 dark:text-white text-base h-40"
          style={{ textAlignVertical: 'top' }}
        />
      </View>

      {/* Charge Warning */}
      <View className="flex-row items-start bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 shadow-sm dark:shadow-none">
        <ShieldAlert size={20} color="#10b981" style={{ marginTop: 2 }} />
        <View className="flex-1 ml-3">
          <Text className="text-slate-900 dark:text-white font-bold text-xs">Platform Guarantee</Text>
          <Text className="text-slate-600 dark:text-slate-450 text-[11px] mt-1 leading-relaxed">
            You will only be charged when the expert answers. If the expert declines or fails to answer within 72 hours, your deposit of ₦{currentPrice} will be fully refunded to your wallet.
          </Text>
        </View>
      </View>

      {/* Purchase Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || !seekerContent.trim()}
        className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg mb-12 ${
          !seekerContent.trim() ? 'bg-primary-500/50' : 'bg-primary-500 shadow-primary-500'
        }`}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Sparkles size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white font-bold text-lg">Send Question (₦{currentPrice})</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  </View>
  );
}
