/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Linking, Alert, Platform, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Booking, Question } from '@/types';
import { Calendar, MessageSquare, ExternalLink, Star, Mic, Square, Play, Pause, Trash, Volume2 } from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import SubmitReviewModal from '@/components/review/SubmitReviewModal';
import { useChatStore } from '@/store/chatStore';

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
  const isDesktop = Platform.OS === 'web' || width >= 768;
  // Allow deep-linking to a specific sub-tab via ?tab=calls or ?tab=questions
  const [activeTab, setActiveTab] = useState<'calls' | 'questions'>(
    tab === 'questions' ? 'questions' : 'calls'
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
  const [recording, setRecording] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<any>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const getAudioModule = () => {
    try {
      return require('expo-av').Audio;
    } catch (e) {
      console.warn('[Audio] Failed to load expo-av Audio module:', e);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const startRecording = async () => {
    const AudioModule = getAudioModule();
    if (!AudioModule) {
      Alert.alert('Audio Recording Unavailable', 'Native Audio modules are not supported in your current Expo Go client. Please use a development build.');
      return;
    }
    try {
      const { status } = await AudioModule.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required to record audio.');
        return;
      }
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const newRecording = new AudioModule.Recording();
      await newRecording.prepareToRecordAsync(AudioModule.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setRecordedUri(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start voice recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setRecordedUri(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const playPreview = async () => {
    const AudioModule = getAudioModule();
    if (!AudioModule) return;
    try {
      if (!recordedUri) return;
      if (isPlayingPreview && sound) {
        await sound.pauseAsync();
        setIsPlayingPreview(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlayingPreview(true);
      } else {
        const { sound: newSound } = await AudioModule.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlayingPreview(true);
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && !status.isPlaying && status.positionMillis === status.durationMillis) {
            setIsPlayingPreview(false);
          }
        });
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
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit response');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const isExpert = user?.role === 'expert';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955 max-w-2xl w-full self-center" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      {/* Tab Switcher */}
      <View className="flex-row mx-4 my-4 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
        <TouchableOpacity
          onPress={() => setActiveTab('calls')}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
            activeTab === 'calls' ? 'bg-primary-500' : 'bg-transparent'
          }`}
        >
          <Calendar size={16} color={activeTab === 'calls' ? '#fff' : '#64748b'} />
          <Text className={`font-semibold ml-2 text-sm ${activeTab === 'calls' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Live Calls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('questions')}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
            activeTab === 'questions' ? 'bg-primary-500' : 'bg-transparent'
          }`}
        >
          <MessageSquare size={16} color={activeTab === 'questions' ? '#fff' : '#64748b'} />
          <Text className={`font-semibold ml-2 text-sm ${activeTab === 'questions' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Written Questions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        >
          {activeTab === 'calls' ? (
            /* LIVE CALLS LIST */
            bookings.length === 0 ? (
              <View className="items-center justify-center py-16 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed">
                <Calendar size={36} color={isDark ? '#475569' : '#94a3b8'} />
                <Text className="text-slate-500 dark:text-slate-400 text-base mt-3">No live calls scheduled yet</Text>
              </View>
            ) : (
              bookings.map((booking) => {
                const isCurrentUserExpert = booking.expert === user?.id || (booking.expert as any)?._id === user?.id || (booking.expert as any)?.id === user?.id;
                const isCurrentUserSeeker = booking.seeker === user?.id || (booking.seeker as any)?._id === user?.id || (booking.seeker as any)?.id === user?.id;
                const partnerName = isCurrentUserExpert ? booking.seekerProfile?.fullName : booking.expertProfile?.fullName;
                const formattedDate = new Date(booking.scheduledAt).toLocaleString();

                return (
                  <View key={booking._id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none">
                    {/* Header Row: Partner Name, Role Badge, Status Badge */}
                    <View className="flex-row justify-between items-start mb-3.5">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center flex-wrap gap-2">
                          <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">{partnerName}</Text>
                          {isExpert && (
                            <View
                              className={`px-2 py-0.5 rounded-full border ${
                                isCurrentUserExpert
                                  ? 'bg-violet-500/10 border-violet-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20'
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-black uppercase ${
                                  isCurrentUserExpert ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isCurrentUserExpert ? 'Client Request' : 'My Booking'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          📅 {formattedDate}
                        </Text>
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

                    {/* Metadata Strip: Session Details */}
                    <View className="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-2xl mb-4 flex-row justify-between items-center border border-slate-100 dark:border-slate-850">
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">
                        📹 1:1 Video Consultation
                      </Text>
                      <Text className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                        ⏱️ {booking.durationMinutes} mins
                      </Text>
                    </View>

                    {/* Conference Jitsi Meeting Button */}
                    {booking.status === 'confirmed' && booking.meetingLink && (
                      <TouchableOpacity
                        onPress={() => {
                          const partnerProfile = isCurrentUserExpert ? booking.seekerProfile : booking.expertProfile;
                          const partnerId = isCurrentUserExpert
                            ? (typeof booking.seeker === 'string' ? booking.seeker : (booking.seeker as any)?._id || (booking.seeker as any)?.id)
                            : (typeof booking.expert === 'string' ? booking.expert : (booking.expert as any)?._id || (booking.expert as any)?.id);

                          useChatStore.getState().startCallInvite(
                            booking._id,
                            partnerId,
                            booking.meetingLink || '',
                            booking.durationMinutes.toString(),
                            partnerProfile?.fullName || 'Consultation Session'
                          );
                        }}
                        className="w-full bg-emerald-500 py-3.5 rounded-2xl flex-row justify-center items-center mb-3 shadow-lg shadow-emerald-500"
                      >
                        <Text className="text-white font-bold text-sm mr-2">Join Video Call</Text>
                        <ExternalLink size={16} color="#fff" />
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
                        <Text className="text-slate-700 dark:text-slate-350 font-bold text-xs mr-2">Chat with Partner</Text>
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
              })
            )
          ) : (
            /* WRITTEN QUESTIONS LIST */
            questions.length === 0 ? (
              <View className="items-center justify-center py-16 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed">
                <MessageSquare size={36} color={isDark ? '#475569' : '#94a3b8'} />
                <Text className="text-slate-500 dark:text-slate-400 text-base mt-3">No questions submitted yet</Text>
              </View>
            ) : (
              questions.map((question) => {
                const isCurrentUserExpert = question.expert === user?.id || (question.expert as any)?._id === user?.id || (question.expert as any)?.id === user?.id;
                const isCurrentUserSeeker = question.seeker === user?.id || (question.seeker as any)?._id === user?.id || (question.seeker as any)?.id === user?.id;
                const partnerName = isCurrentUserExpert ? question.seekerProfile?.fullName : question.expertProfile?.fullName;
                const datePosted = new Date(question.createdAt).toLocaleDateString();

                return (
                  <View key={question._id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none">
                    {/* Header Row: Partner Name, Role Badge, Status Badge */}
                    <View className="flex-row justify-between items-start mb-3.5">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center flex-wrap gap-2">
                          <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">{partnerName}</Text>
                          {isExpert && (
                            <View
                              className={`px-2 py-0.5 rounded-full border ${
                                isCurrentUserExpert
                                  ? 'bg-violet-500/10 border-violet-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20'
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-black uppercase ${
                                  isCurrentUserExpert ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isCurrentUserExpert ? 'Client Request' : 'My Question'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          📅 Asked {datePosted} • {question.type === 'video' ? '📹 Video' : question.type === 'voice' ? '🎙️ Audio' : '💬 Text'} Q&A
                        </Text>
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
                                  // Pass expert user ID so the reviewer can leave a review from the viewer
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
                                  <Volume2 size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
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
                                          if (sound) {
                                            sound.unloadAsync();
                                            setSound(null);
                                          }
                                        }}
                                        className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center"
                                      >
                                        <Trash size={14} color="#ef4444" />
                                      </TouchableOpacity>
                                    </View>
                                  )}

                                  <View className="ml-2">
                                    <Text className="text-slate-855 dark:text-slate-200 font-bold text-sm">
                                      {isRecording ? 'Recording audio advice...' : recordedUri ? 'Advice recording ready!' : 'Ready to record'}
                                    </Text>
                                    <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                      {isRecording ? 'Tap square to finish' : recordedUri ? 'Preview your answer before submitting' : 'Tap mic to start'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            )}
                          </View>
                        )}

                        <View className="flex-row justify-end space-x-2">
                          <TouchableOpacity
                            onPress={() => {
                              setAnsweringQuestionId(null);
                              setAnswerText('');
                              setRecordedUri(null);
                              if (sound) {
                                sound.unloadAsync();
                                setSound(null);
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
              })
            )
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
