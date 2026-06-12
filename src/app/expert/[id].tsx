import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile, Review } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import CustomHeader from '@/components/ui/CustomHeader';
import PricingTierCard from '@/components/ui/PricingTierCard';
import { Star, MessageSquare, Video, PhoneCall, AlertTriangle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ExpertProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isGuest, user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;
  const router = useRouter();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchExpertDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await api.get(`/expert/${id}`);
        setExpert(data);
        
        const expertUserId = typeof data.user === 'string' ? data.user : data.user?._id || data.user?.id || '';
        if (expertUserId) {
          const reviewData = await api.get(`/review/expert/${expertUserId}`);
          setReviews(reviewData);
        }
      } catch (err) {
        console.error('Error fetching expert details:', err);
        Alert.alert('Error', 'Failed to load expert details');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetail();
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!expert) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-6">
        <AlertTriangle size={36} color="#ef4444" />
        <Text className="text-slate-900 dark:text-white text-base mt-2">Expert profile not found</Text>
      </View>
    );
  }

  // Extract expert's raw user account ID to route questions/bookings correctly
  const expertUserId = typeof expert.user === 'string' ? expert.user : expert.user?.id || (expert.user as any)?._id || '';

  const handleMessageExpert = async () => {
    if (!expertUserId) return;
    try {
      const chatStore = useChatStore.getState();
      const conversation = await chatStore.initiateConversation(expertUserId);
      if (isDesktop) {
        router.push({
          pathname: '/messages' as any,
          params: { conversationId: conversation._id }
        });
      } else {
        router.push({
          pathname: '/chat/[conversationId]' as any,
          params: { conversationId: conversation._id }
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start conversation');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955">
      <View className="flex-1 w-full max-w-3xl self-center">
        <CustomHeader
          title="Expert Details"
          showBackButton
          rightElement={
            !isGuest && (user?.id || (user as any)?._id) !== expertUserId ? (
              <TouchableOpacity
                onPress={handleMessageExpert}
                className="bg-violet-100 dark:bg-violet-950 p-2.5 rounded-2xl border border-violet-200 dark:border-violet-850"
              >
                <MessageSquare size={18} color="#8b5cf6" />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Banner info */}
        <View className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 items-center shadow-sm dark:shadow-none">
          <Image
            source={{ uri: expert.avatarUrl || 'https://via.placeholder.com/150' }}
            className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 mb-4"
          />
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight">
            {expert.fullName}
          </Text>
          <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 text-center font-medium px-4">
            {expert.headline}
          </Text>

          <View className="flex-row items-center mt-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-1.5 rounded-full">
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">
              {expert.ratingAverage.toFixed(1)}
            </Text>
            <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1">
              ({expert.reviewsCount} consultations)
            </Text>
          </View>
        </View>

        {/* Bio Section */}
        <View className="px-6 py-6 border-b border-slate-200 dark:border-slate-900">
          <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-3">About</Text>
          <Text className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed">
            {expert.bio}
          </Text>
        </View>

        {/* Pricing Tiers / Service Packages */}
        <View className="px-6 py-6 border-b border-slate-200 dark:border-slate-900">
          <Text className="text-slate-550 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">Choose Service Type</Text>

          {/* Pricing Tier 1: Text Question */}
          <PricingTierCard
            title="Text Message Advice"
            price={expert.textQuestionPrice.toString()}
            description="Submit a text question and receive a detailed written answer from the expert within 72 hours."
            icon={<MessageSquare size={20} color="#8b5cf6" />}
            actionLabel="Ask Question"
            onPress={() => {
              if (isGuest) {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in or create an account to submit questions to experts.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => {
                      router.replace('/(auth)/login');
                    }}
                  ]
                );
                return;
              }
              router.push({
                pathname: '/seeker/ask-question',
                params: { expertId: expert._id, initialType: 'text' },
              });
            }}
          />

          {/* Pricing Tier 2: Video response */}
          <PricingTierCard
            title="Personalized Video Response"
            price={expert.videoResponsePrice.toString()}
            description="Submit a request and receive a custom, recorded video response answering your queries."
            icon={<Video size={20} color="#8b5cf6" />}
            actionLabel="Request Video"
            onPress={() => {
              if (isGuest) {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in or create an account to request custom video answers.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => {
                      router.replace('/(auth)/login');
                    }}
                  ]
                );
                return;
              }
              router.push({
                pathname: '/seeker/ask-question',
                params: { expertId: expert._id, initialType: 'video' },
              });
            }}
          />

          {/* Pricing Tier 3: Live Consultation */}
          <PricingTierCard
            title="Live scheduled Call"
            price={expert.hourlyRate.toString()}
            description="Book a live 1:1 face-to-face video consultation directly on their calendar slot."
            icon={<PhoneCall size={20} color="#8b5cf6" />}
            actionLabel="Book Video Call"
            onPress={() => {
              if (isGuest) {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in or create an account to schedule video call consultations.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => {
                      router.replace('/(auth)/login');
                    }}
                  ]
                );
                return;
              }
              router.push({
                pathname: '/seeker/book-call',
                params: { expertId: expert._id },
              });
            }}
          />
        </View>

        {/* Reviews Section */}
        <View className="px-6 py-6">
          <Text className="text-slate-555 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">Seeker Reviews</Text>
          
          {reviews.length === 0 ? (
            <View className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 border-dashed p-6 rounded-3xl items-center justify-center">
              <Text className="text-slate-400 dark:text-slate-500 text-xs font-semibold">No reviews yet for this expert</Text>
            </View>
          ) : (
            reviews.map((rev) => {
              const seekerName = rev.seekerProfile?.fullName || (rev.seeker as any)?.email?.split('@')[0] || 'Anonymous Seeker';
              const formattedDate = new Date(rev.createdAt).toLocaleDateString(undefined, {
                dateStyle: 'medium'
              });
              
              return (
                <View key={rev._id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl mb-3 shadow-sm dark:shadow-none">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      {rev.seekerProfile?.avatarUrl ? (
                        <Image
                          source={{ uri: rev.seekerProfile.avatarUrl }}
                          className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 mr-2 border border-slate-200/50 dark:border-slate-800"
                        />
                      ) : null}
                      <Text className="text-slate-900 dark:text-white font-bold text-sm">{seekerName}</Text>
                    </View>
                    <Text className="text-slate-455 dark:text-slate-500 text-[10px]">{formattedDate}</Text>
                  </View>
                  
                  <View className="flex-row items-center mb-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={12}
                        color="#f59e0b"
                        fill={idx < rev.rating ? '#f59e0b' : 'transparent'}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
    
                  <Text className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{rev.comment}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      </View>
    </View>
  );
}
