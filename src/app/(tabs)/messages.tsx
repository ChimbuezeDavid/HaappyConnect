import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore, Conversation } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { Search, MessageSquare, ShieldAlert, Circle, User } from 'lucide-react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations, fetchConversations, isLoadingConversations } = useChatStore();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load conversations on focus/mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchConversations();
    setIsRefreshing(false);
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.otherProfile.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      // Parse ISO string
      const date = parseISO(dateString);
      const dist = formatDistanceToNow(date, { addSuffix: false });
      return dist
        .replace('about ', '')
        .replace('over ', '')
        .replace('almost ', '')
        .replace('seconds', 's')
        .replace('minute', 'm')
        .replace('minutes', 'm')
        .replace('hour', 'h')
        .replace('hours', 'h')
        .replace('day', 'd')
        .replace('days', 'd')
        .replace('month', 'mo')
        .replace('months', 'mo')
        .replace('year', 'y')
        .replace('years', 'y');
    } catch {
      return '';
    }
  };

  const getLastMessagePreview = (conv: Conversation) => {
    if (conv.blockedBy && conv.blockedBy.length > 0) {
      return '[Chat Blocked]';
    }
    const lastMsg = conv.lastMessage;
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.isDeleted) return 'This message was deleted';
    
    if (lastMsg.media) {
      if (lastMsg.media.type === 'image') return '📷 Image';
      if (lastMsg.media.type === 'audio') return '🎤 Voice note';
      if (lastMsg.media.type === 'video') return '🎥 Video message';
    }
    return lastMsg.content || '';
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isUnread = item.unreadCount > 0;
    const initials = item.otherProfile.fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // Determine type label (e.g. Booking consultation or Question)
    let typeLabel = '';
    if (item.relatedTo) {
      typeLabel = item.relatedTo.modelType === 'Booking' ? 'Call Session' : 'Question';
    }

    return (
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: '/chat/[conversationId]' as any,
            params: { conversationId: item._id }
          });
        }}
        activeOpacity={0.7}
        className={`flex-row items-center p-4 border-b border-slate-100 dark:border-slate-800/60 ${
          isUnread ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
        }`}
      >
        {/* Avatar */}
        <View className="relative">
          {item.otherProfile.avatarUrl ? (
            <Image
              source={{ uri: item.otherProfile.avatarUrl }}
              className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-violet-500/10 dark:bg-violet-500/20 justify-center items-center">
              <Text className="text-violet-600 dark:text-violet-400 font-bold text-sm">
                {initials || <User size={18} color="#8b5cf6" />}
              </Text>
            </View>
          )}
          {/* Online Dot (Placeholder / Status indicator) */}
          <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 justify-center items-center" />
        </View>

        {/* Conversation Details */}
        <View className="flex-1 ml-3.5 mr-2">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center flex-1 pr-2">
              <Text
                className="text-slate-900 dark:text-white font-extrabold text-sm flex-shrink"
                numberOfLines={1}
              >
                {item.otherProfile.fullName}
              </Text>
              {typeLabel && (
                <View className="ml-2 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                  <Text className="text-[9px] text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wider">
                    {typeLabel}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500">
              {formatMessageTime(item.lastMessage?.createdAt || item.updatedAt as any)}
            </Text>
          </View>
          <Text
            className={`text-xs ${
              isUnread
                ? 'text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            numberOfLines={1}
          >
            {getLastMessagePreview(item)}
          </Text>
        </View>

        {/* Unread Badge / Action Badge */}
        {isUnread && (
          <View className="bg-violet-500 rounded-full w-5 h-5 justify-center items-center">
            <Text className="text-white text-[10px] font-black">{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredConversations = getFilteredConversations();

  if (isLoadingConversations && conversations.length === 0) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-slate-400 text-xs mt-3">Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      {/* Search Bar */}
      <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-slate-950 dark:text-white text-sm"
          />
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item._id}
        renderItem={renderConversationItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20 px-8">
            <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 justify-center items-center mb-4">
              <MessageSquare size={28} color="#94a3b8" />
            </View>
            <Text className="text-slate-900 dark:text-white font-extrabold text-base text-center">
              No conversations found
            </Text>
            <Text className="text-slate-400 text-xs text-center mt-2 leading-relaxed">
              When you book a live call or submit questions to an expert, your messages will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
