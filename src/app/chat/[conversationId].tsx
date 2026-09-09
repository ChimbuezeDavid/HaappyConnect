import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Linking,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  Trash2,
  Check,
  CheckCheck,
  ShieldAlert,
  Lock,
  X,
  ExternalLink,
  Globe,
  MessageSquare,
  Video,
  ShieldCheck,
  Clock,
  RotateCcw,
  Banknote,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Sparkles
} from 'lucide-react-native';
import { useAudioPlayer, useAudioRecorder, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { requestAudioPermission as primeAudioPermission } from '@/services/permissions';

// Animated recording indicator components (replaces NativeWind animate-pulse / animate-ping)
function RecordingPulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.Text style={{ opacity, color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>
      Recording audio... Tap to finish & send
    </Animated.Text>
  );
}

function RecordingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.8, duration: 600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#ef4444',
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// Voice Note Player Component
function VoiceMessageBubble({ uri, isSender }: { uri: string; isSender: boolean }) {
  const player = useAudioPlayer({ uri });
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  };

  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;
  const displayTime = () => {
    const totalSecs = Math.floor((player.duration || player.currentTime) || 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View className="flex-row items-center py-1.5 px-2 rounded-2xl w-56">
      <TouchableOpacity
        onPress={handlePlayPause}
        className={`w-9 h-9 rounded-full justify-center items-center ${
          isSender ? 'bg-white/20' : 'bg-emerald-600'
        }`}
        activeOpacity={0.8}
      >
        {isPlaying ? (
          <Pause size={16} color={isSender ? '#fff' : '#fff'} />
        ) : (
          <Play size={16} color={isSender ? '#fff' : '#fff'} />
        )}
      </TouchableOpacity>
      
      {/* Waveform Visual simulation */}
      <View className="flex-row items-center flex-1 h-6 px-3">
        {[...Array(12)].map((_, i) => {
          const active = progress > i / 12;
          const height = Math.abs(Math.sin(i * 0.7)) * 10 + 6;
          return (
            <View
              key={i}
              style={{ height }}
              className={`w-0.75 mx-0.5 rounded-full ${
                active 
                  ? (isSender ? 'bg-white' : 'bg-emerald-600') 
                  : (isSender ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-700')
              }`}
            />
          );
        })}
      </View>
      <Text className={`text-[10px] ${isSender ? 'text-emerald-200' : 'text-slate-500'}`}>
        {displayTime()}
      </Text>
    </View>
  );
}

// Helper to extract URLs
function extractUrls(text: string): string[] {
  const matches = text.match(/(https?:\/\/[^\s]+)/g);
  return matches ? Array.from(new Set(matches)) : [];
}

// Rich Link Preview Card
function RichLinkCard({ url, isSender }: { url: string; isSender: boolean }) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch (_) {
    hostname = url.replace(/^https?:\/\//, '').split('/')[0];
  }

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.8}
      className={`mt-2 p-2.5 rounded-xl border flex-row items-center ${
        isSender
          ? 'bg-emerald-700/70 border-emerald-500/50'
          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <View className={`p-1.5 rounded-lg mr-2.5 ${isSender ? 'bg-emerald-800' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <Globe size={14} color={isSender ? '#fff' : '#059669'} />
      </View>
      <View className="flex-1 mr-2">
        <Text className={`text-xs font-bold ${isSender ? 'text-white' : 'text-slate-900 dark:text-white'}`} numberOfLines={1}>
          {hostname}
        </Text>
        <Text className={`text-[10px] ${isSender ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`} numberOfLines={1}>
          {url}
        </Text>
      </View>
      <ExternalLink size={14} color={isSender ? '#a7f3d0' : '#64748b'} />
    </TouchableOpacity>
  );
}

// Clickable Message Content with Inlined Links
function FormattedMessageText({ content, isSender }: { content: string; isSender: boolean }) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);

  return (
    <Text className={`text-sm leading-relaxed ${isSender ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
      {parts.map((part, i) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <Text
              key={i}
              onPress={() => Linking.openURL(part)}
              className={`font-semibold underline ${isSender ? 'text-emerald-100' : 'text-primary-600 dark:text-primary-400'}`}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

// Helper: Format countdown time remaining nicely without jargon
function formatTimeRemaining(expiresAtStr: string): { label: string; isExpired: boolean } {
  if (!expiresAtStr) return { label: '', isExpired: false };
  const expiresAt = new Date(expiresAtStr).getTime();
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { label: 'Deadline expired', isExpired: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { label: `${days} day${days > 1 ? 's' : ''} left to respond`, isExpired: false };
  }
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { label: `${hours}h ${minutes}m left to respond`, isExpired: false };
}

// In-Chat Consultation Order Card (Strict Icon-Only Standard, Zero Emojis)
function ConsultationOrderBubble({
  orderData,
  onExtend,
  onRefund,
  onDispute,
  isProcessing,
  activeQuestion,
  isClient
}: {
  orderData: {
    questionId: string;
    type: string;
    price: number;
    quotaTotal: number;
    expiresAt: string;
    content: string;
  };
  onExtend: (id: string) => void;
  onRefund: (id: string) => void;
  onDispute: (id: string) => void;
  isProcessing: boolean;
  activeQuestion?: any;
  isClient: boolean;
}) {
  const isVideo = orderData.type === 'video';
  const effectiveExpiresAt = activeQuestion?.expiresAt || orderData.expiresAt;
  const { label: timeRemaining, isExpired } = formatTimeRemaining(effectiveExpiresAt);
  const quotaUsed = activeQuestion?.quotaUsed ?? 0;
  const quotaTotal = activeQuestion?.quotaTotal ?? orderData.quotaTotal;
  const remaining = Math.max(0, quotaTotal - quotaUsed);
  const isFulfilled = quotaUsed >= quotaTotal || activeQuestion?.status === 'answered';
  const isRefunded = activeQuestion?.status === 'refunded' || activeQuestion?.escrowStatus === 'refunded';
  const isDisputed = activeQuestion?.status === 'disputed';
  const isExpiredStatus = activeQuestion?.status === 'expired' || isExpired;

  return (
    <View className="my-3 w-full max-w-[94%] self-center rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 p-5 shadow-sm">
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="p-2.5 rounded-2xl bg-emerald-500/10 mr-3">
            {isVideo ? (
              <Video size={18} color="#059669" />
            ) : (
              <MessageSquare size={18} color="#059669" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-slate-900 dark:text-white font-extrabold text-sm" numberOfLines={1}>
              {isVideo ? 'Video Breakdown Package' : 'Written Advisory Package'}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <ShieldCheck size={12} color="#059669" style={{ marginRight: 4 }} />
              <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                Escrow Protected (₦{orderData.price.toLocaleString()})
              </Text>
            </View>
          </View>
        </View>

        {isFulfilled && (
          <View className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
              Fulfilled
            </Text>
          </View>
        )}
      </View>

      {/* Quota & Timer Status Row */}
      <View className="my-3.5 bg-slate-50 dark:bg-slate-955 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isVideo ? 'Video Delivery' : 'Package Quota Progress'}
          </Text>
          <View className="bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <Text className="text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              {isFulfilled
                ? 'All Deliveries Completed'
                : `${quotaUsed} of ${quotaTotal} answered`}
            </Text>
          </View>
        </View>

        {/* Visual Progress Bar */}
        <View className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2.5">
          <View
            style={{ width: `${Math.min(100, Math.round(((quotaUsed || 0) / (quotaTotal || 1)) * 100))}%` }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </View>

        {/* Human-friendly Timer */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Clock size={13} color={isExpiredStatus && !isFulfilled ? '#ef4444' : '#64748b'} style={{ marginRight: 4 }} />
            <Text className={`text-xs font-semibold ${isExpiredStatus && !isFulfilled ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
              {isFulfilled ? 'Completed' : isRefunded ? 'Refunded' : timeRemaining}
            </Text>
          </View>
          {!isFulfilled && !isRefunded && (
            <Text className="text-slate-400 text-[11px]">
              {remaining} remaining
            </Text>
          )}
        </View>
      </View>

      {/* Inquiry Brief */}
      <View className="mb-2">
        <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
          Inquiry Brief
        </Text>
        <Text className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          {orderData.content}
        </Text>
      </View>

      {/* Auto-Expiry Action Trigger (Shown only to Client if deadline passed without full response) */}
      {isClient && isExpiredStatus && !isFulfilled && !isRefunded && (
        <View className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/40">
          <View className="flex-row items-center mb-2.5">
            <AlertCircle size={14} color="#ef4444" style={{ marginRight: 6 }} />
            <Text className="text-red-600 dark:text-red-400 text-xs font-bold">
              Response deadline expired without expert reply
            </Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onExtend(orderData.questionId)}
              disabled={isProcessing}
              className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 px-3 rounded-xl flex-row items-center justify-center border border-slate-200 dark:border-slate-700"
              activeOpacity={0.8}
            >
              <RotateCcw size={13} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-slate-800 dark:text-white text-xs font-bold">
                Give 24 More Hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onRefund(orderData.questionId)}
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 py-2.5 px-3 rounded-xl flex-row items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <Banknote size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-xs font-bold">
                Instant Refund
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Discrete Dispute Option for Completed Orders */}
      {isClient && isFulfilled && !isDisputed && (
        <View className="mt-2 pt-2 flex-row justify-end">
          <TouchableOpacity
            onPress={() => onDispute(orderData.questionId)}
            className="flex-row items-center py-1 px-2 rounded-lg"
          >
            <AlertTriangle size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text className="text-slate-400 text-[11px] font-semibold">
              Report an issue with answer
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isDisputed && (
        <View className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex-row items-center">
          <AlertTriangle size={14} color="#d97706" style={{ marginRight: 6 }} />
          <Text className="text-amber-800 dark:text-amber-300 text-xs font-semibold flex-1">
            Issue reported. Our support team is cross-examining this consultation.
          </Text>
        </View>
      )}
    </View>
  );
}

// In-Chat System Notice Bubble (Clean text & SVG icons)
function SystemNoticeBubble({ noticeType, content }: { noticeType: string; content: string }) {
  let IconComponent = CheckCircle2;
  let iconColor = '#059669';
  let bgColor = 'bg-slate-100 dark:bg-slate-900';
  let borderColor = 'border-slate-200 dark:border-slate-800';

  if (noticeType === 'EXTENDED') {
    IconComponent = RotateCcw;
    iconColor = '#059669';
  } else if (noticeType === 'REFUNDED') {
    IconComponent = Banknote;
    iconColor = '#10b981';
  } else if (noticeType === 'DISPUTED') {
    IconComponent = AlertTriangle;
    iconColor = '#f59e0b';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/30';
  } else if (noticeType === 'COMPLETED') {
    IconComponent = CheckCircle2;
    iconColor = '#059669';
  }

  return (
    <View className={`my-2 self-center max-w-[90%] px-4 py-2.5 rounded-2xl border ${bgColor} ${borderColor} flex-row items-center`}>
      <IconComponent size={14} color={iconColor} style={{ marginRight: 8 }} />
      <Text className="text-slate-700 dark:text-slate-300 text-xs leading-snug flex-1 font-medium">
        {content}
      </Text>
    </View>
  );
}

interface ChatRoomScreenProps {
  conversationIdProp?: string;
  isInlineProp?: boolean;
}

export default function ChatRoomScreen({ conversationIdProp, isInlineProp }: ChatRoomScreenProps) {
  const router = useRouter();
  const { conversationId: paramId } = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = conversationIdProp || paramId;
  const isInline = isInlineProp ?? false;
  const { user } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {
    conversations,
    messages,
    isTyping,
    isLoadingMessages,
    fetchMessages,
    sendMessage,
    sendMediaMessage,
    setTyping,
    blockConversation,
    reportConversation,
    deleteMessage,
    clearActiveChat
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);

  // Consultation Gating & Active Package State
  const [consultationStatus, setConsultationStatus] = useState<{
    isGated: boolean;
    expertUserId?: string;
    expertProfileId?: string;
    expertName?: string;
    textQuestionPrice?: number;
    videoResponsePrice?: number;
    textPackagePrice?: number;
    textPackageCount?: number;
    videoPackagePrice?: number;
    videoPackageCount?: number;
    responseWindowDays?: number;
    callPricePerMinute?: number;
    hourlyRate?: number;
    activeQuestion?: any;
  }>({ isGated: false });

  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // In-chat rate picker & direct Paystack purchase state
  const [packagePickerVisible, setPackagePickerVisible] = useState(false);
  const [isPurchasingPackage, setIsPurchasingPackage] = useState(false);

  const handlePurchasePackage = async (type: 'text' | 'video') => {
    const targetExpertId = consultationStatus.expertUserId || consultationStatus.expertProfileId;
    if (!targetExpertId) {
      Alert.alert('Error', 'Mentor profile information not loaded yet.');
      return;
    }
    setIsPurchasingPackage(true);
    try {
      const redirectUri = ExpoLinking.createURL('consultation-callback');
      const initData = await api.post('/question/initiate', {
        expertId: targetExpertId,
        type,
        seekerContent: inputText.trim() || `Consultation inquiry with ${consultationStatus.expertName || 'Mentor'}`,
        redirect_uri: redirectUri,
      });

      if (initData && initData.authorizationUrl) {
        if (Platform.OS === 'web') {
          window.location.href = initData.authorizationUrl;
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(initData.authorizationUrl, redirectUri);
        if (result.type === 'success' && result.url) {
          const parsed = ExpoLinking.parse(result.url);
          const { reference, status } = parsed.queryParams || {};
          if (reference && (status === 'success' || !status)) {
            await api.post('/question/verify-payment', { reference });
            setPackagePickerVisible(false);
            await checkConsultationStatus();
            if (conversationId) {
              await fetchMessages(conversationId);
            }
            if (inputText.trim()) {
              await sendMessage(conversationId, inputText.trim());
              setInputText('');
            }
            Alert.alert('Consultation Activated', 'Your package is now active. You can chat directly with your mentor!');
          } else {
            Alert.alert('Payment Incomplete', 'Payment was cancelled or failed.');
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Could not launch Paystack checkout.');
    } finally {
      setIsPurchasingPackage(false);
    }
  };

  // Dispute reporting modal state
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeQuestionId, setDisputeQuestionId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('Incomplete response to inquiry');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const checkConsultationStatus = async () => {
    if (!conversationId) return;
    try {
      const data = await api.get(`/chat/conversations/${conversationId}/consultation-status`);
      setConsultationStatus(data);
      if (data?.activeQuestion) {
        setActiveQuestion(data.activeQuestion);
      }
    } catch (_) {}
  };

  const handleExpireAction = async (questionId: string, action: 'extend' | 'refund') => {
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/question/${questionId}/auto-expire-action`, { action });
      Alert.alert(action === 'extend' ? 'Deadline Extended' : '100% Refund Processed', res.message);
      await checkConsultationStatus();
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not process request');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDisputeOpen = (questionId: string) => {
    setDisputeQuestionId(questionId);
    setDisputeModalVisible(true);
  };

  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim() || !disputeQuestionId) {
      Alert.alert('Validation Error', 'Please choose a reason for the report.');
      return;
    }
    setIsSubmittingDispute(true);
    try {
      const res = await api.post(`/question/${disputeQuestionId}/dispute`, {
        reason: disputeReason.trim(),
        details: disputeDetails.trim()
      });
      setDisputeModalVisible(false);
      setDisputeReason('Incomplete response to inquiry');
      setDisputeDetails('');
      Alert.alert('Report Filed', res.message || 'Our team will review your consultation report.');
      await checkConsultationStatus();
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not submit report');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Listen to live consultation update socket events
  useEffect(() => {
    const socket = useChatStore.getState().socket;
    if (!socket) return;
    const handleConsultationUpdated = (updated: any) => {
      setActiveQuestion((prev: any) => ({
        ...prev,
        ...updated
      }));
      checkConsultationStatus();
    };
    socket.on('consultationUpdated', handleConsultationUpdated);
    return () => {
      socket.off('consultationUpdated', handleConsultationUpdated);
    };
  }, []);

  // Audio Recording State
  const [audioPermission, setAudioPermission] = useState<{ granted: boolean } | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    getRecordingPermissionsAsync().then((status) => {
      setAudioPermission({ granted: status.granted });
    });
  }, []);

  const requestAudioPermission = async () => {
    const status = await requestRecordingPermissionsAsync();
    setAudioPermission({ granted: status.granted });
    return status;
  };

  // Typing timer reference
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find the conversation meta
  const conversation = conversations.find((c) => c._id === conversationId);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      checkConsultationStatus();
    }
    return () => {
      clearActiveChat();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId) return;

    if (consultationStatus.isGated) {
      setPackagePickerVisible(true);
      return;
    }

    try {
      await sendMessage(conversationId, inputText.trim());
      setInputText('');
      setTyping(conversationId, false);
    } catch (err: any) {
      if (err.message?.includes('consultation')) {
        checkConsultationStatus();
        Alert.alert('Paid Consultation Required', err.message);
      }
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!conversationId) return;

    setTyping(conversationId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(conversationId, false);
    }, 2000);
  };

  // Image Picker Trigger
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Haappy-Connect needs access to your gallery to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64 && conversationId) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        await sendMediaMessage(conversationId as string, asset.base64 as string, fileName, 'image');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not send image');
    }
  };

  // Voice Recording Triggers
  const handleStartRecording = async () => {
    try {
      if (!audioPermission?.granted) {
        const granted = await primeAudioPermission();
        setAudioPermission({ granted });
        if (!granted) return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  };

  const handleStopRecording = async () => {
    if (!conversationId) return;
    setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        // Read file as base64
        const response = await fetch(uri as string);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          await sendMediaMessage(conversationId, base64data, `voice_${Date.now()}.m4a`, 'audio');
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.warn('Failed to stop recording', err);
    }
  };

  // Block handler
  const handleToggleBlock = () => {
    if (!conversationId) return;
    setIsMenuOpen(false);
    const statusLabel = conversation?.isBlocked ? 'unblock' : 'block';
    Alert.alert(
      `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} Conversation`,
      `Are you sure you want to ${statusLabel} this conversation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: statusLabel.toUpperCase(),
          style: 'destructive',
          onPress: async () => {
            await blockConversation(conversationId);
          }
        }
      ]
    );
  };

  // Report handler
  const handleReportSubmit = async () => {
    if (!reportReason.trim() || !conversationId) return;
    try {
      await reportConversation(conversationId, reportReason.trim());
      setReportModalVisible(false);
      setReportReason('');
      Alert.alert('Report Submitted', 'Thank you. We will investigate this report and take appropriate actions.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit report');
    }
  };

  // Delete message handler
  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(messageId)
        }
      ]
    );
  };

  // Render message bubble
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isSender = item.senderId === user?.id || item.senderId === (user as any)?._id;
    const readCount = item.readBy.filter(uid => uid !== item.senderId).length;
    const isRead = readCount > 0;

    if (item.isDeleted) {
      return (
        <View className={`my-1.5 flex-row ${isSender ? 'justify-end' : 'justify-start'}`}>
          <View className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl max-w-[75%] border border-slate-200/40 dark:border-slate-800/40">
            <Text className="text-slate-400 dark:text-slate-500 text-xs italic">
              This message was deleted
            </Text>
          </View>
        </View>
      );
    }

    // Interactive Consultation Order Card
    const orderMatch = item.content?.match(/^\[CONSULTATION_ORDER:([^:]+):([^:]+):([^:]+):([^:]+):([^\]]+)\]\n*([\s\S]*)/);
    if (orderMatch) {
      const orderData = {
        questionId: orderMatch[1],
        type: orderMatch[2],
        price: Number(orderMatch[3]) || 0,
        quotaTotal: Number(orderMatch[4]) || 1,
        expiresAt: orderMatch[5],
        content: orderMatch[6],
      };
      const isClient = user?.role === 'seeker' || (activeQuestion?.seeker && (user?.id === activeQuestion.seeker || (user as any)?._id === activeQuestion.seeker)) || isSender;

      return (
        <ConsultationOrderBubble
          orderData={orderData}
          onExtend={(qId) => handleExpireAction(qId, 'extend')}
          onRefund={(qId) => handleExpireAction(qId, 'refund')}
          onDispute={handleDisputeOpen}
          isProcessing={isProcessingAction}
          activeQuestion={activeQuestion}
          isClient={!!isClient}
        />
      );
    }

    // System Status Notice (e.g. extension, refund, dispute)
    const sysMatch = item.content?.match(/^\[SYSTEM_NOTICE:([^\]]+)\]\s*([\s\S]*)/);
    if (sysMatch) {
      return (
        <SystemNoticeBubble
          noticeType={sysMatch[1]}
          content={sysMatch[2]}
        />
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => isSender && handleDeleteMessage(item._id)}
        activeOpacity={0.9}
        className={`my-1.5 flex-row ${isSender ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`px-4 py-2.5 rounded-2xl max-w-[75%] relative ${
            isSender
              ? 'bg-emerald-600 rounded-tr-none shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-tl-none shadow-sm'
          }`}
        >
          {/* Media Content */}
          {item.media && (
            <View className="mb-1.5 rounded-xl overflow-hidden">
              {item.media.type === 'image' && (
                <TouchableOpacity onPress={() => setImageViewerUri(item.media!.url)}>
                  <Image
                    source={{ uri: item.media.url }}
                    className="w-56 h-40 bg-slate-200 dark:bg-slate-900"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              {item.media.type === 'audio' && (
                <VoiceMessageBubble uri={item.media.url} isSender={isSender} />
              )}
            </View>
          )}

          {/* Text Content & Rich Link Cards */}
          {item.content && (
            <View>
              <FormattedMessageText content={item.content} isSender={isSender} />
              {extractUrls(item.content).map((url, idx) => (
                <RichLinkCard key={`${item._id}-link-${idx}`} url={url} isSender={isSender} />
              ))}
            </View>
          )}

          {/* Timestamp & Read receipts */}
          <View className="flex-row justify-end items-center mt-1 space-x-1">
            <Text
              className={`text-[11px] ${
                isSender ? 'text-emerald-200' : 'text-slate-450 dark:text-slate-500'
              }`}
            >
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isSender && (
              <View>
                {isRead ? (
                  <CheckCheck size={11} color="#c084fc" />
                ) : (
                  <Check size={11} color="#a78bfa" />
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const chatContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-955 shadow-sm z-10">
        <View className="flex-row items-center flex-1 mr-4">
          {!isInline && (
            <TouchableOpacity onPress={() => router.back()} className="p-1 mr-1">
              <ChevronLeft size={24} color="#059669" />
            </TouchableOpacity>
          )}

          <View className="relative">
            {conversation?.otherProfile.avatarUrl ? (
              <Image
                source={{ uri: conversation.otherProfile.avatarUrl }}
                className="w-10 h-10 rounded-full bg-slate-200"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 justify-center items-center">
                <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  {conversation?.otherProfile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-955" />
          </View>

          <View className="ml-3 flex-1">
            <Text
              className="text-slate-900 dark:text-white font-extrabold text-sm"
              numberOfLines={1}
            >
              {conversation?.otherProfile.fullName || 'Consultation Chat'}
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500" numberOfLines={1}>
              {isTyping ? 'typing...' : (conversation?.otherProfile.headline || 'Online')}
            </Text>
          </View>
        </View>

        {/* Options Menu Trigger */}
        <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
          <MoreVertical size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu Modal / Sheet overlay */}
      {isMenuOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
          className="absolute top-0 bottom-0 left-0 right-0 z-50 bg-black/10"
        >
          <View
            className="absolute right-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2 w-48 shadow-2xl"
            style={{ top: Platform.OS === 'ios' ? 95 : 55 }}
          >
            <TouchableOpacity
              onPress={handleToggleBlock}
              className="flex-row items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
            >
              <ShieldAlert size={16} color="#ef4444" className="mr-2.5" />
              <Text className="text-red-500 font-bold text-xs">
                {conversation?.isBlocked ? 'Unblock Chat' : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setReportModalVisible(true);
              }}
              className="flex-row items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
            >
              <ShieldAlert size={16} color="#f59e0b" className="mr-2.5" />
              <Text className="text-amber-500 font-bold text-xs">Report User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Conversation Message List */}
      {isLoadingMessages ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item._id}
          renderItem={renderMessageItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          className="flex-1 bg-transparent"
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20 pr-4">
              <Text className="text-slate-400 dark:text-slate-655 text-xs italic text-center">
                No messages yet. Send a greeting to start chatting!
              </Text>
            </View>
          }
        />
      )}

      {/* Paid Consultation Rate Banner */}
      {consultationStatus.isGated && (
        <View className="mx-4 mb-2.5 p-3.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 rounded-2xl flex-row items-center justify-between shadow-sm">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-0.5">
              <Sparkles size={14} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-emerald-900 dark:text-emerald-300 font-extrabold text-xs">
                Consult with {consultationStatus.expertName || 'Mentor'}
              </Text>
            </View>
            <Text className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight">
              Select an advisory rate package to send questions directly.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPackagePickerVisible(true)}
            className="bg-emerald-600 px-3.5 py-2 rounded-xl flex-row items-center shadow-sm"
            activeOpacity={0.85}
          >
            <Text className="text-white text-xs font-bold mr-1">Choose Rate</Text>
            <ChevronRight size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      {conversation?.isBlocked ? (
        <View className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/40 justify-center items-center">
          <Text className="text-xs text-red-500 font-bold">
            This conversation is blocked.
          </Text>
        </View>
      ) : (
        <View className="py-3 px-4 flex-row items-center border-t border-slate-150 dark:border-slate-900 bg-white dark:bg-slate-950 shadow-lg">
          {/* Attachment Button */}
          {!consultationStatus.isGated && (
            <TouchableOpacity
              onPress={handlePickImage}
              className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full mr-2.5 shadow-sm"
              activeOpacity={0.8}
            >
              <ImageIcon size={18} color={isDark ? '#34d399' : '#059669'} />
            </TouchableOpacity>
          )}

          {/* Micro-recording overlay */}
          {isRecording ? (
            <TouchableOpacity
              onPress={handleStopRecording}
              className="flex-1 bg-red-500/10 border border-red-500/20 rounded-2xl py-2.5 px-4 flex-row items-center justify-between shadow-inner"
            >
              <RecordingPulse />
              <RecordingDot />
            </TouchableOpacity>
          ) : (
            <TextInput
              value={inputText}
              onChangeText={handleInputChange}
              editable={true}
              placeholder={consultationStatus.isGated ? `Ask ${consultationStatus.expertName || 'mentor'} a question...` : "Type a message..."}
              placeholderTextColor={consultationStatus.isGated ? "#059669" : "#94a3b8"}
              multiline
              className={`flex-1 bg-slate-50 dark:bg-slate-900 border ${
                consultationStatus.isGated
                  ? 'border-emerald-500/40'
                  : 'border-slate-200 dark:border-slate-800'
              } text-slate-955 dark:text-white rounded-2xl px-4 py-3 text-sm max-h-24 shadow-inner`}
            />
          )}

          {/* Media Send Buttons */}
          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleSend}
              className="p-3 bg-emerald-600 rounded-full ml-2.5 shadow-md shadow-emerald-600/20"
              activeOpacity={0.8}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            consultationStatus.isGated ? (
              <TouchableOpacity
                onPress={() => setPackagePickerVisible(true)}
                className="p-3 bg-emerald-600/15 border border-emerald-500/30 rounded-full ml-2.5 shadow-sm"
                activeOpacity={0.8}
              >
                <Sparkles size={18} color="#059669" />
              </TouchableOpacity>
            ) : (
              !isRecording && (
                <TouchableOpacity
                  onPress={handleStartRecording}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full ml-2.5 shadow-sm"
                  activeOpacity={0.8}
                >
                  <Mic size={18} color={isDark ? '#34d399' : '#059669'} />
                </TouchableOpacity>
              )
            )
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-955">
      {isInline ? (
        chatContent
      ) : (
        <View className="flex-1 w-full max-w-4xl self-center bg-white dark:bg-slate-900 border-x border-slate-200/50 dark:border-slate-800/80 shadow-xl">
          {chatContent}
        </View>
      )}

      {/* Image Preview Modal */}
      <Modal visible={!!imageViewerUri} transparent={true} animationType="fade">
        <View className="flex-1 bg-black justify-center items-center relative">
          <TouchableOpacity
            onPress={() => setImageViewerUri(null)}
            className="absolute top-12 right-6 p-2 bg-white/20 rounded-full z-50"
          >
            <X size={20} color="#fff" />
          </TouchableOpacity>
          {imageViewerUri && (
            <Image
              source={{ uri: imageViewerUri }}
              className="w-full h-4/5"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal 
        visible={reportModalVisible} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReportModalVisible(false)} />
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-900 dark:text-white font-extrabold text-base">
                Report User
              </Text>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)} 
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-400 text-xs mb-3">
              Please specify the reason why you are reporting this user. We review all reports carefully.
            </Text>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="E.g. harassment, scams, inappropriate language..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              className="bg-slate-100 dark:bg-slate-800 text-slate-955 dark:text-white rounded-2xl p-3.5 text-sm min-h-[100px] mb-5 align-top"
            />
            <TouchableOpacity
              onPress={handleReportSubmit}
              disabled={!reportReason.trim()}
              className={`py-3.5 rounded-2xl items-center ${
                reportReason.trim() ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <Text
                className={`font-bold text-sm ${
                  reportReason.trim() ? 'text-white' : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                Submit Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dispute / Issue with Consultation Modal (Icon-only, no emojis) */}
      <Modal
        visible={disputeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDisputeModalVisible(false)} />
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <AlertTriangle size={18} color="#f59e0b" style={{ marginRight: 8 }} />
                <Text className="text-slate-900 dark:text-white font-extrabold text-base">
                  Report Issue with Consultation
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDisputeModalVisible(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 dark:text-slate-400 text-xs mb-3 leading-relaxed">
              If the mentor provided incomplete, off-topic, or inadequate guidance, submit a report for our team to cross-examine.
            </Text>

            {/* Quick Reason Chips */}
            <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
              Reason for Report
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[
                'Incomplete response to inquiry',
                'Misleading or unhelpful advice',
                'Unprofessional conduct',
                'Other'
              ].map((reason) => {
                const isSelected = disputeReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setDisputeReason(reason)}
                    className={`px-3 py-1.5 rounded-full border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Text className={`text-xs ${isSelected ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </Text>
            <TextInput
              value={disputeDetails}
              onChangeText={setDisputeDetails}
              placeholder="Describe the issue with the delivered answer..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              className="bg-slate-100 dark:bg-slate-800 text-slate-955 dark:text-white rounded-2xl p-3.5 text-sm min-h-[80px] mb-5 align-top"
            />

            <TouchableOpacity
              onPress={handleDisputeSubmit}
              disabled={isSubmittingDispute || !disputeReason.trim()}
              className={`py-3.5 rounded-2xl items-center flex-row justify-center ${
                disputeReason.trim() ? 'bg-amber-600' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              {isSubmittingDispute ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <AlertTriangle size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="font-bold text-sm text-white">
                    Submit Dispute Report
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-Chat Consultation Rate & Package Picker Modal (No emojis, Lucide icons only) */}
      <Modal
        visible={packagePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPackagePickerVisible(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPackagePickerVisible(false)} />
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 max-h-[85%] border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center mb-1">
                  <Sparkles size={18} color="#059669" style={{ marginRight: 6 }} />
                  <Text className="text-slate-900 dark:text-white font-extrabold text-lg">
                    Select Consultation Rate
                  </Text>
                </View>
                <Text className="text-slate-500 dark:text-slate-400 text-xs">
                  Direct advisory with {consultationStatus.expertName || 'Mentor'}. Choose your package to activate chat.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPackagePickerVisible(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={18} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              {/* Option 1: Written Advisory */}
              <View className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row items-center">
                    <View className="p-2.5 bg-emerald-500/10 rounded-xl mr-3">
                      <MessageSquare size={20} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-white font-bold text-sm">
                        Written Consultation
                      </Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">
                        {consultationStatus.textPackageCount || 3} Questions included
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                      ₦{(consultationStatus.textPackagePrice || consultationStatus.textQuestionPrice || 3000).toLocaleString()}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">package</Text>
                  </View>
                </View>

                {/* Bullets */}
                <View className="py-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 mb-3">
                  <View className="flex-row items-center mb-1">
                    <CheckCircle2 size={13} color="#059669" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      Detailed, actionable guidance via chat
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <Clock size={13} color="#059669" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      Reply within {consultationStatus.responseWindowDays || 3} business days
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <ShieldCheck size={13} color="#059669" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      100% Escrow Protection & money-back guarantee
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handlePurchasePackage('text')}
                  disabled={isPurchasingPackage}
                  className="w-full bg-emerald-600 py-3 rounded-xl flex-row justify-center items-center shadow-sm active:opacity-90"
                >
                  {isPurchasingPackage ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-xs mr-1">Pay with Paystack</Text>
                      <ChevronRight size={14} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Option 2: Video Advisory */}
              <View className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row items-center">
                    <View className="p-2.5 bg-blue-500/10 rounded-xl mr-3">
                      <Video size={20} color="#2563eb" />
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-white font-bold text-sm">
                        Video Consultation
                      </Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">
                        {consultationStatus.videoPackageCount || 1} Video Response included
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-blue-600 dark:text-blue-400 font-extrabold text-base">
                      ₦{(consultationStatus.videoPackagePrice || consultationStatus.videoResponsePrice || 5000).toLocaleString()}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">package</Text>
                  </View>
                </View>

                {/* Bullets */}
                <View className="py-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 mb-3">
                  <View className="flex-row items-center mb-1">
                    <CheckCircle2 size={13} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      Personalized video reply from mentor
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <Clock size={13} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      Delivered within {consultationStatus.responseWindowDays || 3} business days
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <ShieldCheck size={13} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text className="text-slate-600 dark:text-slate-300 text-xs">
                      100% Escrow Protection & money-back guarantee
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handlePurchasePackage('video')}
                  disabled={isPurchasingPackage}
                  className="w-full bg-blue-600 py-3 rounded-xl flex-row justify-center items-center shadow-sm active:opacity-90"
                >
                  {isPurchasingPackage ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-xs mr-1">Pay with Paystack</Text>
                      <ChevronRight size={14} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Option 3: Live 1-on-1 Call */}
              {consultationStatus.callPricePerMinute && (
                <View className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl mb-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center">
                      <View className="p-2.5 bg-violet-500/10 rounded-xl mr-3">
                        <PhoneCall size={20} color="#7c3aed" />
                      </View>
                      <View>
                        <Text className="text-slate-900 dark:text-white font-bold text-sm">
                          Live 1-on-1 Call
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs">
                          Real-time audio / video call
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-violet-600 dark:text-violet-400 font-extrabold text-base">
                        ₦{consultationStatus.callPricePerMinute.toLocaleString()}
                      </Text>
                      <Text className="text-slate-400 text-[10px]">per min</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setPackagePickerVisible(false);
                      if (consultationStatus.expertProfileId) {
                        router.push({
                          pathname: '/seeker/book-call',
                          params: { expertId: consultationStatus.expertProfileId }
                        } as any);
                      }
                    }}
                    className="w-full bg-slate-900 dark:bg-white py-3 rounded-xl flex-row justify-center items-center shadow-sm active:opacity-90 mt-2"
                  >
                    <Text className="text-white dark:text-slate-900 font-bold text-xs mr-1">
                      Schedule Live Call
                    </Text>
                    <ChevronRight size={14} color={isDark ? '#0f172a' : '#fff'} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
