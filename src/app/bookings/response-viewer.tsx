import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomHeader from '@/components/ui/CustomHeader';
import { Play, Pause, RotateCcw, MessageSquare, Video, Volume2, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ResponseViewerScreen() {
  const { questionId, seekerContent, expertResponse, type } = useLocalSearchParams<{
    questionId: string;
    seekerContent: string;
    expertResponse: string;
    type: 'text' | 'voice' | 'video';
  }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0.35); // mock active progress
  const [currentTime, setCurrentTime] = useState('0:42');
  const [duration, setDuration] = useState('2:00');

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setProgress(0);
    setCurrentTime('0:00');
    setIsPlaying(false);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <CustomHeader title={`${type === 'video' ? 'Video' : 'Audio'} Response`} showBackButton />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Media Player Mock Box */}
        <View className="px-4 py-4">
          <View className="w-full h-64 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-805 rounded-3xl overflow-hidden justify-between p-5 relative shadow-sm dark:shadow-none">
            {/* Background Accent */}
            <View className="absolute inset-0 bg-primary-500/5 items-center justify-center">
              {type === 'video' ? (
                <Video size={72} color="#8b5cf6" style={{ opacity: 0.15 }} />
              ) : (
                <Volume2 size={72} color="#8b5cf6" style={{ opacity: 0.15 }} />
              )}
            </View>

            {/* Header info */}
            <View className="flex-row justify-between items-center z-10">
              <View className="bg-slate-100/90 dark:bg-slate-950/80 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800/80 flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-slate-800 dark:text-white text-[10px] font-bold uppercase tracking-wider">
                  Playback Ready
                </Text>
              </View>
            </View>

            {/* Playback Controls Overlay Overlay */}
            <View className="items-center justify-center z-10 my-4">
              <TouchableOpacity
                onPress={handlePlayToggle}
                className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center shadow-lg shadow-primary-500/50"
              >
                {isPlaying ? (
                  <Pause size={28} color="#fff" fill="#fff" />
                ) : (
                  <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>

            {/* Scrubbing timeline */}
            <View className="z-10">
              {/* Progress Slider track */}
              <View className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-2.5 overflow-hidden">
                <View style={{ width: `${progress * 100}%` }} className="h-full bg-primary-500" />
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 dark:text-slate-400 text-xs">{currentTime}</Text>
                
                <TouchableOpacity onPress={handleRestart} className="flex-row items-center">
                  <RotateCcw size={12} color={isDark ? '#64748b' : '#475569'} />
                  <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1">Restart</Text>
                </TouchableOpacity>
                
                <Text className="text-slate-500 dark:text-slate-400 text-xs">{duration}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Text Transcript Panel */}
        <View className="px-6 py-4">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Advice Details</Text>
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm dark:shadow-none">
            <View className="flex-row items-center mb-3">
              <Sparkles size={16} color="#8b5cf6" />
              <Text className="text-slate-900 dark:text-white font-bold text-sm ml-2">Expert Transcript</Text>
            </View>
            <Text className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed">
              {expertResponse || 'No written transcript available. Please press Play to listen to the media memo response from the expert.'}
            </Text>
          </View>
        </View>

        {/* Original Question Context */}
        <View className="px-6 py-2">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Your Original Question</Text>
          <View className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-5 rounded-3xl">
            <View className="flex-row items-center mb-3">
              <MessageSquare size={16} color={isDark ? '#64748b' : '#475569'} />
              <Text className="text-slate-700 dark:text-slate-400 font-semibold text-sm ml-2">Submitted Question</Text>
            </View>
            <Text className="text-slate-600 dark:text-slate-450 text-sm leading-relaxed italic">
              "{seekerContent || 'No details provided.'}"
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
