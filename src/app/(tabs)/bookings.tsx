/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Linking, Alert, Platform, useWindowDimensions, Image } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Booking, Question } from '@/types';
import { Calendar, MessageSquare, ExternalLink, Star, Mic, Square, Play, Pause, Trash, Volume2, Clock, Video, Sparkles, Filter } from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import SubmitReviewModal from '@/components/review/SubmitReviewModal';
import { useChatStore } from '@/store/chatStore';
import { requestAudioPermission } from '@/services/permissions';
import { getAvatarUrl } from '@/lib/avatar';

export default function BookingsScreen() {
  const { user, token, isGuest } = useAuthStore();
  const router = useRouter();
  const { tab, promptReview, expertId, promptComplete } = useLocalSearchParams<{
    tab?: string;
    promptReview?: string;
    expertId?: string;
    promptComplete?: string;
  }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Unified consultation stream filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'calls' | 'questions'>(
    tab === 'questions' ? 'questions' : tab === 'calls' ? 'calls' : 'all'
  );

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

  // Expert answer state
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Audio recording states
  const [recorder, setRecorder] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    return () => {
      if (player) {
        player.release?.();
      }
    };
  }, [player]);

  const startRecording = async () => {
    try {
      const granted = await requestAudioPermission();
      if (!granted) {
        return;
      }
      const { AudioRecorder, RecordingPresets, setAudioModeAsync } = require('expo-audio');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      const newRecorder = new AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await newRecorder.prepareToRecordAsync();
      newRecorder.record();
      setRecorder(newRecorder);
      setIsRecording(true);
      setRecordedUri(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start voice recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recorder) return;
      await recorder.stop();
      const uri = recorder.uri;
      setRecorder(null);
      setIsRecording(false);
      setRecordedUri(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const playPreview = async () => {
    try {
      if (!recordedUri) return;
      const { createAudioPlayer } = require('expo-audio');
      if (isPlayingPreview && player) {
        player.pause();
        setIsPlayingPreview(false);
      } else if (player) {
        player.play();
        setIsPlayingPreview(true);
      } else {
        const newPlayer = createAudioPlayer(recordedUri);
        setPlayer(newPlayer);
        newPlayer.addListener('playbackStatusUpdate', (status: any) => {
          if (!status.playing && status.currentTime >= status.duration && status.duration > 0) {
            setIsPlayingPreview(false);
          }
        });
        newPlayer.play();
        setIsPlayingPreview(true);
      }
    } catch (err) {
      console.error('Preview error', err);
    }
  };

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

  const handleAnswerQuestionSubmit = async (id: string, type: 'text' | 'voice' | 'video') => {
    if (!answerText.trim() && !recordedUri) {
      Alert.alert('Validation Error', 'Please write a response or record audio advice.');
      return;
    }
    setSubmittingAnswer(true);
    try {
      let expertResponseUrl = '';
      if (recordedUri) {
        try {
          const { uploadMedia } = require('@/lib/api');
          const fileName = `voice-response-${id}.m4a`;
          const uploadRes = await uploadMedia(recordedUri, fileName, 'audio/m4a');
          expertResponseUrl = uploadRes.url;
        } catch (uploadError: any) {
          Alert.alert('Upload Failed', 'Failed to upload recorded memo: ' + uploadError.message);
          setSubmittingAnswer(false);
          return;
        }
      }

      await api.patch(`/question/${id}/answer`, { 
        expertResponse: answerText,
        expertResponseUrl 
      });

      Alert.alert('Success', 'Response submitted successfully');
      setAnsweringQuestionId(null);
      setAnswerText('');
      setRecordedUri(null);
      if (player) {
        player.release?.();
        setPlayer(null);
      }
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit response');
    } finally {
      setSubmittingAnswer(false);
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

    if (typeFilter === 'all' || typeFilter === 'calls') {
      bookings.forEach((b) => {
        const isActive = b.status === 'confirmed' || b.status === 'pending';
        const isCompleted = b.status === 'completed' || b.status === 'cancelled';
        if (statusFilter === 'active' && !isActive) return;
        if (statusFilter === 'completed' && !isCompleted) return;
        items.push({
          kind: 'booking',
          data: b,
          timestamp: new Date(b.scheduledAt).getTime() || 0,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'questions') {
      questions.forEach((q) => {
        const isActive = q.status === 'pending';
        const isCompleted = q.status === 'answered' || q.status === 'declined' || q.status === 'refunded';
        if (statusFilter === 'active' && !isActive) return;
        if (statusFilter === 'completed' && !isCompleted) return;
        items.push({
          kind: 'question',
          data: q,
          timestamp: new Date(q.createdAt).getTime() || 0,
        });
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, questions, statusFilter, typeFilter]);

  return (
    <View className={`flex-1 w-full ${isDesktop ? 'px-8' : 'max-w-2xl self-center px-4'}`} style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      {/* Streamlined Filter Hub: Eliminates Stacked Tab Bars */}
      <View className="my-4">
        {/* Row 1: Status Filter Pills */}
        <View className="flex-row items-center gap-2 mb-3">
          <TouchableOpacity
            onPress={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl border ${
              statusFilter === 'all'
                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'all' ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}>
              All ({totalConsultationsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatusFilter('active')}
            className={`px-3.5 py-2 rounded-xl border ${
              statusFilter === 'active'
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'active' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
              Active ({totalActiveCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatusFilter('completed')}
            className={`px-3.5 py-2 rounded-xl border ${
              statusFilter === 'completed'
                ? 'bg-slate-700 border-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text className={`text-xs font-bold ${statusFilter === 'completed' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
              Completed ({totalCompletedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Type Filter Chips */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg ${
              typeFilter === 'all'
                ? 'bg-primary-500/10 border border-primary-500/30'
                : 'bg-transparent border border-transparent'
            }`}
          >
            <Text className={`text-xs font-semibold ${typeFilter === 'all' ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
              All Types
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTypeFilter('calls')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              typeFilter === 'calls'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-transparent border border-transparent'
            }`}
          >
            <Video size={13} color={typeFilter === 'calls' ? '#2563eb' : (isDark ? '#94a3b8' : '#64748b')} />
            <Text className={`text-xs font-semibold ${typeFilter === 'calls' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
              Live Calls ({bookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTypeFilter('questions')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              typeFilter === 'questions'
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-transparent border border-transparent'
            }`}
          >
            <MessageSquare size={13} color={typeFilter === 'questions' ? '#059669' : (isDark ? '#94a3b8' : '#64748b')} />
            <Text className={`text-xs font-semibold ${typeFilter === 'questions' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
              Written Q&A ({questions.length})
            </Text>
          </TouchableOpacity>
        </View>
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
            <View className="items-center justify-center py-16 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed px-6 my-4">
              <Calendar size={36} color={isDark ? '#475569' : '#94a3b8'} />
              <Text className="text-slate-800 dark:text-slate-200 font-bold text-base mt-3">No consultations found</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs text-center mt-1 mb-4">
                {statusFilter === 'active'
                  ? 'You have no active or upcoming consultations right now.'
                  : statusFilter === 'completed'
                  ? 'No completed consultations in this view.'
                  : 'Your live bookings and written consultations will appear here.'}
              </Text>
              {!isExpert && (
                <TouchableOpacity
                  onPress={() => router.push('/')}
                  className="bg-primary-500 px-5 py-2.5 rounded-xl flex-row items-center"
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
                    <View key={`booking-${booking._id}`} style={isDesktop ? { width: '49%' } : undefined} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none">
                      {/* Top Format Banner */}
                      <View className="flex-row items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-850">
                        <View className="flex-row items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                          <Video size={12} color="#2563eb" />
                          <Text className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                            1:1 Video Consultation
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Clock size={11} color={isDark ? '#cbd5e1' : '#64748b'} />
                          <Text className="text-slate-600 dark:text-slate-400 font-bold text-xs">
                            {booking.durationMinutes} mins
                          </Text>
                        </View>
                      </View>

                      {/* Header Row: Partner Avatar & Name, Role Badge, Status Badge */}
                      <View className="flex-row justify-between items-start mb-3.5">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Image
                            source={{ uri: getAvatarUrl(partnerAvatar, partnerName) }}
                            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 mr-3 border border-slate-200 dark:border-slate-800"
                          />
                          <View className="flex-1">
                            <View className="flex-row items-center flex-wrap gap-2">
                              <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">{partnerName}</Text>
                              {isExpert && (
                                <View className="px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20">
                                  <Text className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                    {isCurrentUserExpert ? 'Client Request' : 'My Booking'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View className="flex-row items-center gap-1.5 mt-1">
                              <Calendar size={12} color={isDark ? '#64748b' : '#94a3b8'} />
                              <Text className="text-slate-400 dark:text-slate-500 text-xs">
                                {formattedDate}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Status & Price Pill Group */}
                        <View className="items-end">
                          <View
                            className={`px-2.5 py-1 rounded-full mb-1 ${
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
                          <Text className="text-slate-900 dark:text-white font-extrabold text-sm">
                            ₦{booking.price.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Conference Meeting Button */}
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
                          className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl flex-row justify-center items-center mb-3 shadow-sm"
                        >
                          <Video size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text className="text-white font-bold text-sm mr-2">Join Video Call Room</Text>
                        </TouchableOpacity>
                      )}

                      {/* Messaging CTA */}
                      {booking.status !== 'cancelled' && (
                        <TouchableOpacity
                          onPress={() => {
                            const partnerId = isCurrentUserExpert
                              ? (typeof booking.seeker === 'string' ? booking.seeker : (booking.seeker as any)?._id || (booking.seeker as any)?.id)
                              : (typeof booking.expert === 'string' ? booking.expert : (booking.expert as any)?._id || (booking.expert as any)?.id);
                            handleStartChat(partnerId, 'Booking', booking._id);
                          }}
                          className="w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-2xl flex-row justify-center items-center mb-3 border border-slate-200 dark:border-slate-700/50"
                        >
                          <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs mr-2">
                            {isCurrentUserExpert ? 'Chat with Client' : 'Chat with Mentor'}
                          </Text>
                          <MessageSquare size={14} color={isDark ? '#94a3b8' : '#475569'} />
                        </TouchableOpacity>
                      )}

                      {/* Action Triggers */}
                      {isCurrentUserExpert && booking.status === 'pending' && (
                        <View className="flex-row space-x-3">
                          <TouchableOpacity
                            onPress={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                            className="flex-1 bg-red-500/10 border border-red-500/20 py-3 rounded-2xl items-center mr-2"
                          >
                            <Text className="text-red-600 dark:text-red-400 font-semibold text-sm">Decline</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleUpdateBookingStatus(booking._id, 'confirmed')}
                            className="flex-1 bg-primary-500 py-3 rounded-2xl items-center shadow-lg shadow-primary-500"
                          >
                            <Text className="text-white font-semibold text-sm">Confirm</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {isCurrentUserExpert && booking.status === 'confirmed' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateBookingStatus(booking._id, 'completed')}
                          className="w-full bg-blue-600/10 border border-blue-500/20 py-3.5 rounded-2xl items-center"
                        >
                          <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">Mark as Completed</Text>
                        </TouchableOpacity>
                      )}

                      {isCurrentUserSeeker && booking.status === 'pending' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                          className="w-full bg-red-500/10 border border-red-500/25 py-3.5 rounded-2xl items-center"
                        >
                          <Text className="text-red-655 dark:text-red-400 font-semibold text-sm">Cancel Booking</Text>
                        </TouchableOpacity>
                      )}

                      {isCurrentUserSeeker && booking.status === 'completed' && !booking.hasReview && (
                        <TouchableOpacity
                          onPress={() => {
                            const expertObj = booking.expert as any;
                            setSelectedExpertId(expertObj._id || expertObj);
                            setSelectedBookingId(booking._id);
                            setSelectedQuestionId(undefined);
                            setReviewVisible(true);
                          }}
                          className="w-full bg-primary-500 py-3.5 rounded-2xl items-center mb-1 shadow-lg shadow-primary-500"
                        >
                          <Text className="text-white font-bold text-sm">Leave a Review</Text>
                        </TouchableOpacity>
                      )}

                      {isCurrentUserSeeker && booking.status === 'completed' && booking.hasReview && (
                        <View className="w-full bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center border border-slate-250 dark:border-slate-800">
                          <Star size={14} color="#f59e0b" fill="#f59e0b" className="mr-1.5" />
                          <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs ml-1">Feedback Submitted</Text>
                        </View>
                      )}
                    </View>
                  );
                } else {
                  const question = item.data;
                  const isCurrentUserExpert = question.expert === user?.id || (question.expert as any)?._id === user?.id || (question.expert as any)?.id === user?.id;
                  const isCurrentUserSeeker = question.seeker === user?.id || (question.seeker as any)?._id === user?.id || (question.seeker as any)?.id === user?.id;
                  const partnerName = isCurrentUserExpert ? question.seekerProfile?.fullName : question.expertProfile?.fullName;
                  const datePosted = new Date(question.createdAt).toLocaleDateString();

                  return (
                    <View key={`question-${question._id}`} style={isDesktop ? { width: '49%' } : undefined} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none">
                      {/* Top Format Banner */}
                      <View className="flex-row items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-850">
                        <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <MessageSquare size={12} color="#059669" />
                          <Text className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Written Consultation • {question.type === 'video' ? 'Video' : question.type === 'voice' ? 'Audio' : 'Text'}
                          </Text>
                        </View>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs">
                          Asked {datePosted}
                        </Text>
                      </View>

                      {/* Header Row: Partner Name, Role Badge, Status Badge */}
                      <View className="flex-row justify-between items-start mb-3.5">
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center flex-wrap gap-2">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">{partnerName}</Text>
                            {isExpert && (
                              <View className="px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20">
                                <Text className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                  {isCurrentUserExpert ? 'Client Request' : 'My Question'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Status & Price Pill Group */}
                        <View className="items-end">
                          <View
                            className={`px-2.5 py-1 rounded-full mb-1 ${
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
                          <Text className="text-slate-900 dark:text-white font-extrabold text-sm">
                            ₦{question.price.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Question Content Block */}
                      <View className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-850">
                        <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-wider mb-1.5">
                          Client Prompt
                        </Text>
                        <Text className="text-slate-900 dark:text-white text-sm leading-relaxed font-medium">
                          "{question.seekerContent}"
                        </Text>
                      </View>

                      {/* Response Content */}
                      {question.status === 'answered' && question.expertResponse && (
                        <View className="bg-primary-500/5 dark:bg-primary-500/5 p-4 rounded-2xl mb-4 border border-primary-500/10">
                          <Text className="text-primary-500 dark:text-primary-400 text-[10px] uppercase font-bold tracking-wide mb-1">Expert Answer</Text>
                          <Text className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-3">{question.expertResponse}</Text>
                          {(question.type === 'video' || question.type === 'voice') && (
                            <TouchableOpacity
                              onPress={() =>
                                router.push({
                                  pathname: '/bookings/response-viewer',
                                  params: {
                                    questionId: question._id,
                                    seekerContent: question.seekerContent,
                                    expertResponse: question.expertResponse,
                                    type: question.type,
                                    expertUserId: typeof question.expert === 'string'
                                      ? question.expert
                                      : (question.expert as any)?._id || (question.expert as any)?.id || '',
                                  },
                                })
                              }
                              className="bg-primary-500 py-2.5 rounded-xl items-center flex-row justify-center mt-2"
                            >
                              <Text className="text-white font-bold text-xs">Play Response Media</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Chat button for Question */}
                      <TouchableOpacity
                        onPress={() => {
                          const partnerId = isCurrentUserExpert
                            ? (typeof question.seeker === 'string' ? question.seeker : (question.seeker as any)?._id || (question.seeker as any)?.id)
                            : (typeof question.expert === 'string' ? question.expert : (question.expert as any)?._id || (question.expert as any)?.id);
                          handleStartChat(partnerId, 'Question', question._id);
                        }}
                        className="w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-2xl flex-row justify-center items-center mb-3 border border-slate-200 dark:border-slate-700/50"
                      >
                        <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs mr-2">Open Conversation</Text>
                        <MessageSquare size={14} color={isDark ? '#94a3b8' : '#475569'} />
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
                          className="w-full bg-primary-500 py-3.5 rounded-2xl items-center mb-1 shadow-lg shadow-primary-500"
                        >
                          <Text className="text-white font-bold text-sm">Leave a Review</Text>
                        </TouchableOpacity>
                      )}

                      {isCurrentUserSeeker && question.status === 'answered' && question.hasReview && (
                        <View className="w-full bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center border border-slate-250 dark:border-slate-850">
                          <Star size={14} color="#f59e0b" fill="#f59e0b" className="mr-1.5" />
                          <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs ml-1">Feedback Submitted</Text>
                        </View>
                      )}

                      {/* Expert Action Panel */}
                      {isCurrentUserExpert && question.status === 'pending' && answeringQuestionId !== question._id && (
                        <View className="flex-row space-x-3">
                          <TouchableOpacity
                            onPress={() => handleDeclineQuestion(question._id)}
                            className="flex-1 bg-red-500/10 border border-red-500/20 py-3 rounded-2xl items-center mr-2"
                          >
                            <Text className="text-red-650 dark:text-red-400 font-semibold text-sm">Decline</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setAnsweringQuestionId(question._id)}
                            className="flex-1 bg-primary-500 py-3 rounded-2xl items-center shadow-lg shadow-primary-500"
                          >
                            <Text className="text-white font-semibold text-sm">Answer</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Expert Input Form for Answering */}
                      {isCurrentUserExpert && question.status === 'pending' && answeringQuestionId === question._id && (
                        <View className="mt-2 border-t border-slate-200 dark:border-slate-800/60 pt-4">
                          <Text className="text-slate-800 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-2">Write Your Answer</Text>
                          <TextInput
                            value={answerText}
                            onChangeText={setAnswerText}
                            placeholder="Provide detailed 1:1 professional advice here..."
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            multiline
                            numberOfLines={5}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white text-sm h-32 mb-3"
                            style={{ textAlignVertical: 'top' }}
                          />
                          {/* Audio recording panel for voice/video questions */}
                          {(question.type === 'voice' || question.type === 'video') && (
                            <View className="mb-4 bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl">
                              <Text className="text-slate-700 dark:text-slate-350 text-xs font-bold mb-3 uppercase tracking-wider">
                                {question.type === 'video' ? 'Video Answer (Audio Track Memo)' : 'Audio Advice Record'}
                              </Text>
                              
                              {Platform.OS === 'web' ? (
                                <View className="items-center py-2">
                                  <Text className="text-slate-500 dark:text-slate-400 text-xs mb-3">Upload pre-recorded audio/video response file</Text>
                                  <TouchableOpacity
                                    onPress={async () => {
                                      if (Platform.OS === 'web') {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'audio/*,video/*';
                                        input.onchange = async (e: any) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const url = URL.createObjectURL(file);
                                            setRecordedUri(url);
                                          }
                                        };
                                        input.click();
                                      }
                                    }}
                                    className="bg-primary-500/10 border border-primary-500/20 px-5 py-3 rounded-xl flex-row items-center"
                                  >
                                    <Volume2 size={16} color="#059669" style={{ marginRight: 6 }} />
                                    <Text className="text-primary-600 dark:text-primary-400 font-bold text-xs">
                                      {recordedUri ? 'Change Media File' : 'Select Media File'}
                                    </Text>
                                  </TouchableOpacity>
                                  {recordedUri && (
                                    <Text className="text-emerald-500 text-xs font-semibold mt-2">Media File selected successfully!</Text>
                                  )}
                                </View>
                              ) : (
                                <View className="flex-row items-center justify-between">
                                  <View className="flex-row items-center space-x-3">
                                    {!recordedUri && (
                                      <TouchableOpacity
                                        onPress={isRecording ? stopRecording : startRecording}
                                        className={`w-12 h-12 rounded-full items-center justify-center ${
                                          isRecording ? 'bg-red-500' : 'bg-primary-500'
                                        }`}
                                      >
                                        {isRecording ? (
                                          <Square size={16} color="#fff" fill="#fff" />
                                        ) : (
                                          <Mic size={18} color="#fff" />
                                        )}
                                      </TouchableOpacity>
                                    )}

                                    {recordedUri && (
                                      <View className="flex-row space-x-2">
                                        <TouchableOpacity
                                          onPress={playPreview}
                                          className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center mr-2"
                                        >
                                          {isPlayingPreview ? (
                                            <Pause size={14} color={isDark ? '#fff' : '#0f172a'} />
                                          ) : (
                                            <Play size={14} color={isDark ? '#fff' : '#0f172a'} style={{ marginLeft: 2 }} />
                                          )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          onPress={() => {
                                            setRecordedUri(null);
                                            if (player) {
                                              player.release?.();
                                              setPlayer(null);
                                            }
                                          }}
                                          className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center"
                                        >
                                          <Trash size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                      </View>
                                    )}
                                  </View>

                                  <View className="items-end">
                                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                      {isRecording ? 'Recording active...' : recordedUri ? 'Voice Memo Ready' : 'Tap mic to record'}
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Submit Action */}
                          <View className="flex-row justify-end items-center mt-2">
                            <TouchableOpacity
                              onPress={() => {
                                setAnsweringQuestionId(null);
                                setAnswerText('');
                                setRecordedUri(null);
                                if (player) {
                                  player.release?.();
                                  setPlayer(null);
                                }
                              }}
                              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 mr-2"
                            >
                              <Text className="text-slate-600 dark:text-slate-400 font-semibold text-sm">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleAnswerQuestionSubmit(question._id, question.type)}
                              disabled={submittingAnswer || (!answerText.trim() && !recordedUri)}
                              className="px-5 py-2.5 rounded-xl bg-emerald-500 items-center justify-center"
                            >
                              {submittingAnswer ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text className="text-white font-semibold text-sm">Submit Answer</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
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
