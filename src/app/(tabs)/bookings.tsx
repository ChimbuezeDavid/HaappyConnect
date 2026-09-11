/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
  Image
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Booking, Question } from '@/types';
import {
  Calendar,
  MessageSquare,
  Star,
  Clock,
  Video,
  Sparkles,
  Search,
  X,
  CheckCircle2
} from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SubmitReviewModal from '@/components/review/SubmitReviewModal';
import { useChatStore } from '@/store/chatStore';
import { getAvatarUrl } from '@/lib/avatar';

export default function BookingsScreen() {
  const { user, token, isGuest } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab, promptReview, expertId, promptComplete } = useLocalSearchParams<{
    tab?: string;
    promptReview?: string;
    expertId?: string;
    promptComplete?: string;
  }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Single-row consolidated filter state: 'all' | 'active' | 'written' | 'calls' | 'completed'
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'written' | 'calls' | 'completed'>(
    tab === 'questions' ? 'written' : tab === 'calls' ? 'calls' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartChat = async (participantId: string, relatedToModel?: 'Booking' | 'Question', relatedToId?: string) => {
    try {
      const chatStore = useChatStore.getState();
      const conversation = await chatStore.initiateConversation(participantId, relatedToModel, relatedToId);
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Review states
  const [reviewVisible, setReviewVisible] = useState(false);
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | undefined>(undefined);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const bookingList = await api.get('/booking');
      setBookings(bookingList);

      const questionList = await api.get('/question');
      setQuestions(questionList);
    } catch (error) {
      console.error('Error fetching bookings/questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      await api.patch(`/booking/${id}/status`, { status });
      Alert.alert('Success', `Booking status updated to ${status}`);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update booking');
    }
  };

  useEffect(() => {
    if (isGuest || !token) {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [isGuest, token]);

  // Auto-launch rating feedback modal if seeker returned from a completed call session
  useEffect(() => {
    if (promptReview && expertId) {
      setSelectedExpertId(expertId);
      setSelectedBookingId(promptReview);
      setSelectedQuestionId(undefined);
      setReviewVisible(true);
      router.setParams({ promptReview: undefined, expertId: undefined });
    }
  }, [promptReview, expertId]);

  // Auto-launch completed session confirmation for experts
  useEffect(() => {
    if (promptComplete) {
      Alert.alert(
        'Consultation Finished',
        'Would you like to mark this consultation session as completed to release the escrow hold payment?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => router.setParams({ promptComplete: undefined }) 
          },
          { 
            text: 'Mark Completed', 
            onPress: async () => {
              await handleUpdateBookingStatus(promptComplete, 'completed');
              router.setParams({ promptComplete: undefined });
            } 
          }
        ]
      );
    }
  }, [promptComplete]);

  // Early return for guest mode (must be declared after all hooks)
  if (isGuest) {
    return <SignInWall />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeclineQuestion = async (id: string) => {
    try {
      await api.patch(`/question/${id}/decline`, {});
      Alert.alert('Success', 'Question declined and seeker refunded');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline question');
    }
  };

  const isExpert = user?.role === 'expert';

  const activeBookingsCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
  const completedBookingsCount = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length;
  const activeQuestionsCount = questions.filter(q => q.status === 'pending').length;
  const completedQuestionsCount = questions.filter(q => q.status === 'answered' || q.status === 'declined' || q.status === 'refunded').length;

  const totalActiveCount = activeBookingsCount + activeQuestionsCount;
  const totalCompletedCount = completedBookingsCount + completedQuestionsCount;
  const totalConsultationsCount = bookings.length + questions.length;

  const filteredConsultations = useMemo(() => {
    const items: Array<
      | { kind: 'booking'; data: Booking; timestamp: number }
      | { kind: 'question'; data: Question; timestamp: number }
    > = [];

    const query = searchQuery.trim().toLowerCase();

    // Filter bookings
    if (activeFilter === 'all' || activeFilter === 'calls' || activeFilter === 'active' || activeFilter === 'completed') {
      bookings.forEach((b) => {
        const isActive = b.status === 'confirmed' || b.status === 'pending';
        const isCompleted = b.status === 'completed' || b.status === 'cancelled';
        if (activeFilter === 'active' && !isActive) return;
        if (activeFilter === 'completed' && !isCompleted) return;

        if (query) {
          const partnerName = (b.seekerProfile?.fullName || b.expertProfile?.fullName || '').toLowerCase();
          if (!partnerName.includes(query)) return;
        }

        items.push({
          kind: 'booking',
          data: b,
          timestamp: new Date(b.scheduledAt).getTime() || 0,
        });
      });
    }

    // Filter questions
    if (activeFilter === 'all' || activeFilter === 'written' || activeFilter === 'active' || activeFilter === 'completed') {
      questions.forEach((q) => {
        const isActive = q.status === 'pending';
        const isCompleted = q.status === 'answered' || q.status === 'declined' || q.status === 'refunded';
        if (activeFilter === 'active' && !isActive) return;
        if (activeFilter === 'completed' && !isCompleted) return;

        if (query) {
          const partnerName = (q.seekerProfile?.fullName || q.expertProfile?.fullName || '').toLowerCase();
          const content = (q.seekerContent || '').toLowerCase();
          if (!partnerName.includes(query) && !content.includes(query)) return;
        }

        items.push({
          kind: 'question',
          data: q,
          timestamp: new Date(q.createdAt).getTime() || 0,
        });
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, questions, activeFilter, searchQuery]);

  return (
    <View 
      className={`flex-1 w-full ${isDesktop ? 'px-8' : 'max-w-2xl self-center px-4'}`} 
      style={{ 
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        paddingTop: isDesktop ? 0 : (insets.top > 0 ? insets.top + 6 : 10),
      }}
    >
      {/* Search & Single-Row Filter Header */}
      <View className="mt-3 mb-2 space-y-2.5">
        {/* Search Input Bar */}
        <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-sm">
          <Search size={15} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search mentor, client, or topic..."
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="flex-1 text-slate-900 dark:text-white text-xs py-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={14} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Consolidated Horizontal Filter Pill Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
          <View className="flex-row items-center gap-2">
            {[
              { id: 'all', label: `All (${totalConsultationsCount})`, icon: null },
              { id: 'active', label: `Active (${totalActiveCount})`, icon: Clock },
              { id: 'written', label: `Written (${questions.length})`, icon: MessageSquare },
              { id: 'calls', label: `Calls (${bookings.length})`, icon: Video },
              { id: 'completed', label: `Completed (${totalCompletedCount})`, icon: CheckCircle2 }
            ].map((chip) => {
              const isSelected = activeFilter === chip.id;
              const IconComp = chip.icon;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setActiveFilter(chip.id as any)}
                  className={`px-3 py-1.5 rounded-xl border flex-row items-center ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                  activeOpacity={0.8}
                >
                  {IconComp && (
                    <IconComp
                      size={12}
                      color={isSelected ? '#fff' : (isDark ? '#94a3b8' : '#64748b')}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView
          className={`flex-1 ${isDesktop ? '' : 'px-1'}`}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        >
          {filteredConsultations.length === 0 ? (
            <View className="items-center justify-center py-16 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed px-6 my-4">
              <Calendar size={36} color={isDark ? '#475569' : '#94a3b8'} />
              <Text className="text-slate-800 dark:text-slate-200 font-bold text-base mt-3">No consultations found</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs text-center mt-1 mb-4">
                {searchQuery
                  ? `No results matching "${searchQuery}".`
                  : activeFilter === 'active'
                  ? 'You have no active or upcoming consultations right now.'
                  : activeFilter === 'completed'
                  ? 'No completed consultations in this view.'
                  : 'Your live bookings and written consultations will appear here.'}
              </Text>
              {!isExpert && (
                <TouchableOpacity
                  onPress={() => router.push('/')}
                  className="bg-emerald-600 px-5 py-2.5 rounded-xl flex-row items-center"
                >
                  <Sparkles size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold text-xs">Explore Mentors</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className={isDesktop ? "flex-row flex-wrap justify-between" : ""}>
              {filteredConsultations.map((item) => {
                if (item.kind === 'booking') {
                  const booking = item.data;
                  const isCurrentUserExpert = booking.expert === user?.id || (booking.expert as any)?._id === user?.id || (booking.expert as any)?.id === user?.id;
                  const isCurrentUserSeeker = booking.seeker === user?.id || (booking.seeker as any)?._id === user?.id || (booking.seeker as any)?.id === user?.id;
                  const partnerAvatar = isCurrentUserExpert ? booking.seekerProfile?.avatarUrl : booking.expertProfile?.avatarUrl;
                  const partnerName = isCurrentUserExpert
                    ? booking.seekerProfile?.fullName || 'Client'
                    : booking.expertProfile?.fullName || 'Expert';
                  const formattedDate = new Date(booking.scheduledAt).toLocaleString();

                  return (
                    <View
                      key={`booking-${booking._id}`}
                      style={isDesktop ? { width: '49%' } : undefined}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 mb-3.5 shadow-sm dark:shadow-none"
                    >
                      {/* Top Format & Status Bar */}
                      <View className="flex-row items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                        <View className="flex-row items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                          <Video size={12} color="#2563eb" />
                          <Text className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                            Live Call • {booking.durationMinutes} mins
                          </Text>
                        </View>
                        <View
                          className={`px-2.5 py-0.5 rounded-full ${
                            booking.status === 'confirmed'
                              ? 'bg-emerald-500/10 border border-emerald-500/25'
                              : booking.status === 'completed'
                              ? 'bg-blue-500/10 border border-blue-500/25'
                              : booking.status === 'cancelled'
                              ? 'bg-red-500/10 border border-red-500/25'
                              : 'bg-amber-500/10 border border-amber-500/25'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-black uppercase ${
                              booking.status === 'confirmed'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : booking.status === 'completed'
                                ? 'text-blue-600 dark:text-blue-400'
                                : booking.status === 'cancelled'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {booking.status}
                          </Text>
                        </View>
                      </View>

                      {/* Header Row: Partner Avatar & Name, Role Badge, Price */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Image
                            source={{ uri: getAvatarUrl(partnerAvatar, partnerName) }}
                            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 mr-3 border border-slate-200 dark:border-slate-800"
                          />
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                              <Text className="text-slate-900 dark:text-white font-extrabold text-sm tracking-tight" numberOfLines={1}>
                                {partnerName}
                              </Text>
                              <View className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <Text className="text-[9px] font-bold text-slate-500 uppercase">
                                  {isCurrentUserExpert ? 'Client' : 'Mentor'}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-1 mt-0.5">
                              <Calendar size={11} color={isDark ? '#64748b' : '#94a3b8'} />
                              <Text className="text-slate-400 dark:text-slate-500 text-xs">
                                {formattedDate}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <Text className="text-slate-900 dark:text-white font-extrabold text-sm">
                          ₦{booking.price.toLocaleString()}
                        </Text>
                      </View>

                      {/* Summary Teaser */}
                      <Text className="text-slate-500 dark:text-slate-400 text-xs mb-3 italic" numberOfLines={1}>
                        Scheduled 1-on-1 consultation session
                      </Text>

                      {/* Action Buttons */}
                      <View className="flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {booking.status === 'confirmed' && booking.meetingLink && (
                          <TouchableOpacity
                            onPress={() => {
                              const partnerProfile = isCurrentUserExpert ? booking.seekerProfile : booking.expertProfile;
                              const partnerId = isCurrentUserExpert
                                ? (typeof booking.seeker === 'string' ? booking.seeker : (booking.seeker as any)?._id || (booking.seeker as any)?.id)
                                : (typeof booking.expert === 'string' ? booking.expert : (booking.expert as any)?._id || (booking.expert as any)?.id);

                              api.post(`/booking/${booking._id}/start-call`, {}).catch(() => {});

                              router.push({
                                pathname: '/bookings/call' as any,
                                params: {
                                  meetingLink: booking.meetingLink || '',
                                  durationMinutes: booking.durationMinutes.toString(),
                                  partnerName: partnerProfile?.fullName || 'Consultation Session',
                                  bookingId: booking._id,
                                  expertId: isCurrentUserExpert ? user?.id : partnerId,
                                  scheduledAt: booking.scheduledAt ? new Date(booking.scheduledAt).toISOString() : '',
                                }
                              });
                            }}
                            className="flex-1 bg-emerald-600 py-2.5 rounded-xl flex-row justify-center items-center shadow-sm"
                            activeOpacity={0.85}
                          >
                            <Video size={13} color="#fff" style={{ marginRight: 5 }} />
                            <Text className="text-white font-bold text-xs">Join Call</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => {
                            const partnerId = isCurrentUserExpert
                              ? (typeof booking.seeker === 'string' ? booking.seeker : (booking.seeker as any)?._id || (booking.seeker as any)?.id)
                              : (typeof booking.expert === 'string' ? booking.expert : (booking.expert as any)?._id || (booking.expert as any)?.id);
                            handleStartChat(partnerId, 'Booking', booking._id);
                          }}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl flex-row justify-center items-center border border-slate-200 dark:border-slate-700/60"
                          activeOpacity={0.8}
                        >
                          <MessageSquare size={13} color={isDark ? '#94a3b8' : '#475569'} style={{ marginRight: 5 }} />
                          <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                            Open in Chat
                          </Text>
                        </TouchableOpacity>

                        {isCurrentUserExpert && booking.status === 'pending' && (
                          <TouchableOpacity
                            onPress={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                            className="px-3 bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl items-center justify-center"
                          >
                            <Text className="text-red-600 dark:text-red-400 font-bold text-xs">Decline</Text>
                          </TouchableOpacity>
                        )}

                        {isCurrentUserSeeker && booking.status === 'completed' && !booking.hasReview && (
                          <TouchableOpacity
                            onPress={() => {
                              const expertObj = booking.expert as any;
                              setSelectedExpertId(expertObj?._id || expertObj || '');
                              setSelectedBookingId(booking._id);
                              setSelectedQuestionId(undefined);
                              setReviewVisible(true);
                            }}
                            className="px-3 bg-amber-500/15 border border-amber-500/30 py-2.5 rounded-xl flex-row items-center"
                          >
                            <Star size={13} color="#f59e0b" style={{ marginRight: 4 }} />
                            <Text className="text-amber-700 dark:text-amber-300 font-bold text-xs">Review</Text>
                          </TouchableOpacity>
                        )}

                        {isCurrentUserSeeker && booking.status === 'completed' && booking.hasReview && (
                          <View className="px-3 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl flex-row items-center border border-slate-200 dark:border-slate-700/60">
                            <Star size={13} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 4 }} />
                            <Text className="text-slate-500 font-bold text-xs">Rated</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                } else {
                  const question = item.data;
                  const isCurrentUserExpert = question.expert === user?.id || (question.expert as any)?._id === user?.id || (question.expert as any)?.id === user?.id;
                  const isCurrentUserSeeker = question.seeker === user?.id || (question.seeker as any)?._id === user?.id || (question.seeker as any)?.id === user?.id;
                  const partnerAvatar = isCurrentUserExpert ? question.seekerProfile?.avatarUrl : question.expertProfile?.avatarUrl;
                  const partnerName = isCurrentUserExpert
                    ? question.seekerProfile?.fullName || 'Client'
                    : question.expertProfile?.fullName || 'Expert';
                  const datePosted = new Date(question.createdAt).toLocaleDateString();

                  return (
                    <View
                      key={`question-${question._id}`}
                      style={isDesktop ? { width: '49%' } : undefined}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 mb-3.5 shadow-sm dark:shadow-none"
                    >
                      {/* Top Format & Status Bar */}
                      <View className="flex-row items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                        <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <MessageSquare size={12} color="#059669" />
                          <Text className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Written Advisory • {question.type === 'video' ? 'Video' : question.type === 'voice' ? 'Audio' : 'Text'}
                          </Text>
                        </View>
                        <View
                          className={`px-2.5 py-0.5 rounded-full ${
                            question.status === 'answered'
                              ? 'bg-emerald-500/10 border border-emerald-500/25'
                              : question.status === 'declined'
                              ? 'bg-red-500/10 border border-red-500/25'
                              : 'bg-amber-500/10 border border-amber-500/25'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-black uppercase ${
                              question.status === 'answered'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : question.status === 'declined'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {question.status}
                          </Text>
                        </View>
                      </View>

                      {/* Header Row: Partner Avatar & Name, Role Badge, Price */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Image
                            source={{ uri: getAvatarUrl(partnerAvatar, partnerName) }}
                            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 mr-3 border border-slate-200 dark:border-slate-800"
                          />
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                              <Text className="text-slate-900 dark:text-white font-extrabold text-sm tracking-tight" numberOfLines={1}>
                                {partnerName}
                              </Text>
                              <View className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <Text className="text-[9px] font-bold text-slate-500 uppercase">
                                  {isCurrentUserExpert ? 'Client' : 'Mentor'}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-1 mt-0.5">
                              <Calendar size={11} color={isDark ? '#64748b' : '#94a3b8'} />
                              <Text className="text-slate-400 dark:text-slate-500 text-xs">
                                Asked {datePosted}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <Text className="text-slate-900 dark:text-white font-extrabold text-sm">
                          ₦{question.price.toLocaleString()}
                        </Text>
                      </View>

                      {/* Truncated Summary Teaser */}
                      <Text className="text-slate-600 dark:text-slate-300 text-xs mb-3 italic" numberOfLines={1}>
                        "{question.seekerContent}"
                      </Text>

                      {/* Action Buttons */}
                      <View className="flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <TouchableOpacity
                          onPress={() => {
                            const partnerId = isCurrentUserExpert
                              ? (typeof question.seeker === 'string' ? question.seeker : (question.seeker as any)?._id || (question.seeker as any)?.id)
                              : (typeof question.expert === 'string' ? question.expert : (question.expert as any)?._id || (question.expert as any)?.id);
                            handleStartChat(partnerId, 'Question', question._id);
                          }}
                          className="flex-1 bg-emerald-600 py-2.5 rounded-xl flex-row justify-center items-center shadow-sm"
                          activeOpacity={0.85}
                        >
                          <MessageSquare size={13} color="#fff" style={{ marginRight: 5 }} />
                          <Text className="text-white font-bold text-xs">
                            Open in Chat
                          </Text>
                        </TouchableOpacity>

                        {isCurrentUserSeeker && question.status === 'answered' && !question.hasReview && (
                          <TouchableOpacity
                            onPress={() => {
                              const expertObj = question.expert as any;
                              setSelectedExpertId(expertObj._id || expertObj);
                              setSelectedBookingId(undefined);
                              setSelectedQuestionId(question._id);
                              setReviewVisible(true);
                            }}
                            className="px-3 bg-amber-500/15 border border-amber-500/30 py-2.5 rounded-xl flex-row items-center"
                          >
                            <Star size={13} color="#f59e0b" style={{ marginRight: 4 }} />
                            <Text className="text-amber-700 dark:text-amber-300 font-bold text-xs">Review</Text>
                          </TouchableOpacity>
                        )}

                        {isCurrentUserSeeker && question.status === 'answered' && question.hasReview && (
                          <View className="px-3 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl flex-row items-center border border-slate-200 dark:border-slate-700/60">
                            <Star size={13} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 4 }} />
                            <Text className="text-slate-500 font-bold text-xs">Rated</Text>
                          </View>
                        )}

                        {isCurrentUserExpert && question.status === 'pending' && (
                          <TouchableOpacity
                            onPress={() => handleDeclineQuestion(question._id)}
                            className="px-3 bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl items-center justify-center"
                          >
                            <Text className="text-red-600 dark:text-red-400 font-bold text-xs">Decline</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }
              })}
            </View>
          )}
        </ScrollView>
      )}

      <SubmitReviewModal
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        expertId={selectedExpertId}
        bookingId={selectedBookingId}
        questionId={selectedQuestionId}
        onSuccess={fetchData}
      />
    </View>
  );
}
