import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, useWindowDimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile, Review } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import CustomHeader from '@/components/ui/CustomHeader';
import PricingTierCard from '@/components/ui/PricingTierCard';
import AvatarImage from '@/components/ui/AvatarImage';
import { Star, MessageSquare, Video, PhoneCall, AlertTriangle, CheckCircle2, Edit3, UserCheck, Award, Briefcase, ExternalLink, ShieldCheck, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { getAvatarUrl } from '@/lib/avatar';

export default function ExpertProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isGuest, user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!expert) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
        <AlertTriangle size={36} color="#ef4444" />
        <Text className="text-slate-900 dark:text-white text-base mt-2">Expert profile not found</Text>
      </View>
    );
  }

  // Extract expert's raw user account ID to route questions/bookings correctly
  const expertUserId = typeof expert.user === 'string' ? expert.user : expert.user?.id || (expert.user as any)?._id || '';
  const currentUserId = user?.id || (user as any)?._id;
  const isOwnProfile = Boolean(currentUserId && expertUserId && currentUserId.toString() === expertUserId.toString());

  const handleMessageExpert = async () => {
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to start direct conversations with experts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => {
            router.replace('/(auth)/login');
          }}
        ]
      );
      return;
    }
    if (isOwnProfile) {
      Alert.alert('Restricted', 'You cannot send messages to your own profile.');
      return;
    }
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
    <View className="flex-1" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
      <View className="flex-1 w-full max-w-3xl self-center">
        <CustomHeader
          title="Expert Details"
          showBackButton
          rightElement={
            isOwnProfile ? (
              <TouchableOpacity
                onPress={() => router.push('/expert/edit-profile')}
                className="bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex-row items-center"
              >
                <Edit3 size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">Edit Profile</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }} style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
        {/* Banner info */}
        <View className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 items-center shadow-sm dark:shadow-none" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0', borderBottomWidth: 1 }}>
          <AvatarImage
            avatarUrl={expert.avatarUrl}
            fullName={expert.fullName}
            className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 mb-4"
          />
          <View className="flex-row items-center justify-center space-x-1.5">
            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight font-display">
              {expert.fullName}
            </Text>
            {expert.isVerified && (
              <CheckCircle2 size={20} color="#059669" fill="#10B981" />
            )}
          </View>
          <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 text-center font-medium px-4 font-sans">
            {expert.headline}
          </Text>

          <View className="flex-row items-center flex-wrap justify-center gap-2 mt-3">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3.5 py-1.5 rounded-full">
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">
                {expert.ratingAverage.toFixed(1)}
              </Text>
              <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1">
                ({expert.reviewsCount} reviews)
              </Text>
            </View>

            <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
              <Zap size={13} color="#059669" />
              <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-bold ml-1">
                ~{expert.avgResponseHours || 4}h response • {expert.responseRate || 98}%
              </Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View className="px-6 py-6 border-b border-slate-200 dark:border-slate-900" style={{ borderBottomColor: isDark ? '#1e293b' : '#e2e8f0', borderBottomWidth: 1 }}>
          <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-3">About</Text>
          <Text className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed">
            {expert.bio}
          </Text>
        </View>

        {/* Verified Accreditation & Credentials (Cross-examination highlights) */}
        {(expert.isVerified ||
          expert.verificationData?.yearsOfExperience ||
          (expert.verificationData?.certifications && expert.verificationData.certifications.length > 0) ||
          expert.verificationData?.portfolioUrl ||
          expert.verificationData?.mentorshipStatement) && (
          <View
            className="px-6 py-6 border-b border-slate-200 dark:border-slate-900"
            style={{ borderBottomColor: isDark ? '#1e293b' : '#e2e8f0', borderBottomWidth: 1 }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <ShieldCheck size={18} color="#059669" style={{ marginRight: 6 }} />
                <Text className="text-slate-900 dark:text-white text-sm font-bold">
                  Accredited Credentials
                </Text>
              </View>
              {expert.isVerified && (
                <View className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                    Vetted & Verified
                  </Text>
                </View>
              )}
            </View>

            {/* Years of Experience & Portfolio link Row */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {Boolean(expert.verificationData?.yearsOfExperience) && (
                <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <Briefcase size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text className="text-slate-800 dark:text-slate-200 text-xs font-bold">
                    {expert.verificationData?.yearsOfExperience}+ Years Experience
                  </Text>
                </View>
              )}

              {Boolean(expert.verificationData?.portfolioUrl) && (
                <TouchableOpacity
                  onPress={() => {
                    const url = expert.verificationData!.portfolioUrl!;
                    const formatted = url.startsWith('http') ? url : `https://${url}`;
                    Linking.openURL(formatted).catch((err) => console.warn('Cannot open url:', err));
                  }}
                  className="flex-row items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl active:opacity-80"
                >
                  <ExternalLink size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                    Verified Portfolio / Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Certifications List */}
            {expert.verificationData?.certifications && expert.verificationData.certifications.length > 0 && (
              <View className="mb-4">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Licenses & Certifications
                </Text>
                <View className="gap-2">
                  {expert.verificationData.certifications.map((cert, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: isDark ? '#131A22' : '#F8FAFC',
                        borderColor: isDark ? '#222D3D' : '#E2E8F0',
                      }}
                      className="rounded-xl p-3 border flex-row items-center"
                    >
                      <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center mr-3">
                        <Award size={16} color="#059669" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-900 dark:text-white">
                          {cert.title}
                        </Text>
                        <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                          {cert.issuer} {cert.year ? `• ${cert.year}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Mentorship Statement */}
            {Boolean(expert.verificationData?.mentorshipStatement) && (
              <View
                style={{
                  backgroundColor: isDark ? '#131A22' : '#F8FAFC',
                  borderColor: isDark ? '#222D3D' : '#E2E8F0',
                }}
                className="rounded-2xl p-4 border"
              >
                <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Advisory & Mentorship Track Record
                </Text>
                <Text className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed italic">
                  "{expert.verificationData?.mentorshipStatement}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Pricing Tiers / Service Packages */}
        <View className="px-6 py-6 border-b border-slate-200 dark:border-slate-900" style={{ borderBottomColor: isDark ? '#1e293b' : '#e2e8f0', borderBottomWidth: 1 }}>
          <Text className="text-slate-550 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">
            {isOwnProfile ? 'Your Consultation Services' : 'Choose Consultation Type'}
          </Text>

          {isOwnProfile ? (
            <View className="bg-emerald-500/10 border border-emerald-500/25 rounded-3xl p-6 items-center">
              <View className="p-3 bg-emerald-500/20 rounded-2xl mb-3">
                <UserCheck size={28} color="#059669" />
              </View>
              <Text className="text-slate-900 dark:text-white font-bold text-base text-center">
                This is Your Public Profile
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs text-center mt-1 mb-5 leading-relaxed">
                Seekers view these rates and your bio when discovering you. To adjust your rates or update your calendar, tap below:
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/expert/edit-profile')}
                className="bg-primary-500 px-6 py-3.5 rounded-2xl flex-row items-center shadow-md"
              >
                <Edit3 size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-sm">Edit Rates & Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Pricing Tier 1: Text Question */}
              <PricingTierCard
                title="Text Advisory Answer"
                price={expert.textQuestionPrice.toLocaleString()}
                description="Submit your question and receive an actionable written consultation answer backed by our 7-day escrow hold SLA."
                icon={<MessageSquare size={20} color="#059669" />}
                actionLabel="Ask Written Question"
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
                title="Video Advisory Answer"
                price={expert.videoResponsePrice.toLocaleString()}
                description="Submit your brief and receive a personalized, high-clarity recorded video response addressing your question."
                icon={<Video size={20} color="#059669" />}
                actionLabel="Request Video Answer"
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
                title="Live 1:1 Video Consultation"
                price={`${(expert.callPricePerMinute || (expert.hourlyRate ? Math.round(expert.hourlyRate / 60) : 500)).toLocaleString()}/min`}
                description="Direct real-time 1:1 video consultation (15m minimum, 30m, 45m, or 60m). Book an available slot on their calendar."
                icon={<PhoneCall size={20} color="#059669" />}
                actionLabel="Schedule Live 1:1 Call"
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
            </>
          )}
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
                      <AvatarImage
                        avatarUrl={rev.seekerProfile?.avatarUrl}
                        fullName={seekerName}
                        className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 mr-2 border border-slate-200/50 dark:border-slate-800"
                      />
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
