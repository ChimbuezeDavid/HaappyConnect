import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Linking, Alert, Platform, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Booking, Question } from '@/types';
import { Calendar, MessageSquare, ExternalLink, Star } from 'lucide-react-native';
import SignInWall from '@/components/ui/SignInWall';
import { useColorScheme } from 'nativewind';
import SubmitReviewModal from '@/components/review/SubmitReviewModal';
import { useChatStore } from '@/store/chatStore';

export default function BookingsScreen() {
  const { user, token, isGuest } = useAuthStore();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
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

  useEffect(() => {
    if (isGuest || !token) {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [isGuest, token]);

  // Early return for guest mode (must be declared after all hooks)
  if (isGuest) {
    return <SignInWall />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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

  const handleDeclineQuestion = async (id: string) => {
    try {
      await api.patch(`/question/${id}/decline`, {});
      Alert.alert('Success', 'Question declined and seeker refunded');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline question');
    }
  };

  const handleAnswerQuestionSubmit = async (id: string) => {
    if (!answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      await api.patch(`/question/${id}/answer`, { expertResponse: answerText });
      Alert.alert('Success', 'Response submitted successfully');
      setAnsweringQuestionId(null);
      setAnswerText('');
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
                  <View key={booking._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-xl">
                    <View className="flex-row justify-between items-start mb-3">
                      <View>
                        <View className="flex-row items-center flex-wrap gap-2">
                          <Text className="text-slate-900 dark:text-white font-bold text-base">{partnerName}</Text>
                          {/* Role badge context */}
                          {isExpert && (
                            <View
                              className={`px-2 py-0.5 rounded-full border ${
                                isCurrentUserExpert
                                  ? 'bg-violet-500/10 border-violet-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20'
                              }`}
                              style={{ marginLeft: 8 }}
                            >
                              <Text
                                className={`text-[10px] font-bold uppercase ${
                                  isCurrentUserExpert ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isCurrentUserExpert ? 'Client Request' : 'My Booking'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1">{formattedDate}</Text>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Duration: {booking.durationMinutes} min</Text>
                      </View>
                      {/* Status pill */}
                      <View
                        className={`px-3 py-1 rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-emerald-500/10 border border-emerald-500/25'
                            : booking.status === 'completed'
                            ? 'bg-blue-500/10 border border-blue-500/25'
                            : booking.status === 'cancelled'
                            ? 'bg-red-500/10 border border-red-500/25'
                            : 'bg-yellow-500/10 border border-yellow-500/25'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold uppercase ${
                            booking.status === 'confirmed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : booking.status === 'completed'
                              ? 'text-blue-600 dark:text-blue-400'
                              : booking.status === 'cancelled'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}
                        >
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    {/* Booking Price Details */}
                    <View className="bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl mb-4 flex-row justify-between items-center border border-slate-200/50 dark:border-slate-850">
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">Total Charged</Text>
                      <Text className="text-slate-900 dark:text-white font-bold text-sm">₦{booking.price.toLocaleString()}</Text>
                    </View>

                    {/* Conference Jitsi Meeting Button */}
                    {booking.status === 'confirmed' && booking.meetingLink && (
                      <TouchableOpacity
                        onPress={() => {
                          const partnerProfile = isCurrentUserExpert ? booking.seekerProfile : booking.expertProfile;
                          router.push({
                            pathname: '/bookings/call' as any,
                            params: {
                              meetingLink: booking.meetingLink,
                              durationMinutes: booking.durationMinutes.toString(),
                              partnerName: partnerProfile?.fullName || 'Consultation Session'
                            }
                          });
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
                  <View key={question._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-xl">
                    <View className="flex-row justify-between items-start mb-3">
                      <View>
                        <View className="flex-row items-center flex-wrap gap-2">
                          <Text className="text-slate-900 dark:text-white font-bold text-base">{partnerName}</Text>
                          {/* Role badge context */}
                          {isExpert && (
                            <View
                              className={`px-2 py-0.5 rounded-full border ${
                                isCurrentUserExpert
                                  ? 'bg-violet-500/10 border-violet-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20'
                              }`}
                              style={{ marginLeft: 8 }}
                            >
                              <Text
                                className={`text-[10px] font-bold uppercase ${
                                  isCurrentUserExpert ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isCurrentUserExpert ? 'Client Request' : 'My Question'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-slate-550 dark:text-slate-400 text-xs mt-1">Asked: {datePosted}</Text>
                      </View>

                      {/* Status pill */}
                      <View
                        className={`px-3 py-1 rounded-full ${
                          question.status === 'answered'
                            ? 'bg-emerald-500/10 border border-emerald-500/25'
                            : question.status === 'declined'
                            ? 'bg-red-500/10 border border-red-500/25'
                            : 'bg-yellow-500/10 border border-yellow-500/25'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold uppercase ${
                            question.status === 'answered'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : question.status === 'declined'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}
                        >
                          {question.status}
                        </Text>
                      </View>
                    </View>

                    {/* Question Content */}
                    <View className="bg-slate-100 dark:bg-slate-955 p-4 rounded-2xl mb-4 border border-slate-200 dark:border-slate-850">
                      <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wide mb-1">Question</Text>
                      <Text className="text-slate-900 dark:text-white text-sm leading-relaxed">{question.seekerContent}</Text>
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
                        <View className="flex-row justify-end space-x-2">
                          <TouchableOpacity
                            onPress={() => {
                              setAnsweringQuestionId(null);
                              setAnswerText('');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 mr-2"
                          >
                            <Text className="text-slate-600 dark:text-slate-400 font-semibold text-sm">Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleAnswerQuestionSubmit(question._id)}
                            disabled={submittingAnswer || !answerText.trim()}
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
