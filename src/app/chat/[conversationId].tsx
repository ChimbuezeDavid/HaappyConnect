import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import {
  ChevronLeft,
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
  X
} from 'lucide-react-native';
import { useAudioPlayer, useAudioRecorder, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';

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
          isSender ? 'bg-white/20' : 'bg-violet-600'
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
                  ? (isSender ? 'bg-white' : 'bg-violet-600') 
                  : (isSender ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-700')
              }`}
            />
          );
        })}
      </View>
      <Text className={`text-[10px] ${isSender ? 'text-violet-200' : 'text-slate-500'}`}>
        {displayTime()}
      </Text>
    </View>
  );
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuthStore();
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
    }
    return () => {
      clearActiveChat();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  const handleSend = () => {
    if (!inputText.trim() || !conversationId) return;
    sendMessage(conversationId, inputText.trim());
    setInputText('');
    setTyping(conversationId, false);
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
        await requestAudioPermission();
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

    return (
      <TouchableOpacity
        onLongPress={() => isSender && handleDeleteMessage(item._id)}
        activeOpacity={0.9}
        className={`my-1.5 flex-row ${isSender ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`px-4 py-2.5 rounded-2xl max-w-[75%] relative ${
            isSender
              ? 'bg-violet-600 rounded-tr-none'
              : 'bg-slate-100 dark:bg-slate-800 rounded-tl-none'
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

          {/* Text Content */}
          {item.content && (
            <Text
              className={`text-sm leading-relaxed ${
                isSender ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              {item.content}
            </Text>
          )}

          {/* Timestamp & Read receipts */}
          <View className="flex-row justify-end items-center mt-1 space-x-1">
            <Text
              className={`text-[9px] ${
                isSender ? 'text-violet-200' : 'text-slate-400'
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Custom Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/30">
          <View className="flex-row items-center flex-1 mr-4">
            <TouchableOpacity onPress={() => router.back()} className="p-1 mr-1">
              <ChevronLeft size={24} color="#8b5cf6" />
            </TouchableOpacity>

            <View className="relative">
              {conversation?.otherProfile.avatarUrl ? (
                <Image
                  source={{ uri: conversation.otherProfile.avatarUrl }}
                  className="w-10 h-10 rounded-full bg-slate-200"
                />
              ) : (
                <View className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950 justify-center items-center">
                  <Text className="text-violet-600 dark:text-violet-400 font-bold text-xs">
                    {conversation?.otherProfile.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950" />
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
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item._id}
            renderItem={renderMessageItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            className="flex-1 bg-slate-50/30 dark:bg-slate-950/20"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20 pr-4">
                <Text className="text-slate-400 dark:text-slate-600 text-xs italic">
                  No messages yet. Send a greeting to start chatting!
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        {conversation?.isBlocked ? (
          <View className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/40 justify-center items-center">
            <Text className="text-xs text-red-500 font-bold">
              This conversation is blocked.
            </Text>
          </View>
        ) : (
          <View className="p-3 flex-row items-center border-t border-slate-150 dark:border-slate-900 bg-white dark:bg-slate-950">
            {/* Attachment Button */}
            <TouchableOpacity
              onPress={handlePickImage}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full mr-2"
              activeOpacity={0.8}
            >
              <ImageIcon size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Micro-recording overlay */}
            {isRecording ? (
              <TouchableOpacity
                onPress={handleStopRecording}
                className="flex-1 bg-red-500/10 border border-red-500/20 rounded-3xl py-2 px-4 flex-row items-center justify-between"
              >
                <RecordingPulse />
                <RecordingDot />
              </TouchableOpacity>
            ) : (
              <TextInput
                value={inputText}
                onChangeText={handleInputChange}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                multiline
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white rounded-3xl px-4 py-2 text-sm max-h-20"
              />
            )}

            {/* Media Send Buttons */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSend}
                className="p-2.5 bg-violet-600 rounded-full ml-2"
                activeOpacity={0.8}
              >
                <Send size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              !isRecording && (
                <TouchableOpacity
                  onPress={handleStartRecording}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full ml-2"
                  activeOpacity={0.8}
                >
                  <Mic size={18} color="#64748b" />
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </KeyboardAvoidingView>

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
      <Modal visible={reportModalVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-900 dark:text-white font-extrabold text-base">
                Report User
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} className="p-1">
                <X size={20} color="#64748b" />
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
              className="bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white rounded-2xl p-3 text-sm min-h-[100px] mb-5 align-top"
            />
            <TouchableOpacity
              onPress={handleReportSubmit}
              disabled={!reportReason.trim()}
              className={`py-3.5 rounded-2xl items-center ${
                reportReason.trim() ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-800'
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
    </SafeAreaView>
  );
}
