import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { Search, Star, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch(query);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSearch = async (searchVal: string) => {
    setIsLoading(true);
    try {
      const endpoint = searchVal ? `/expert/discover?query=${encodeURIComponent(searchVal)}` : '/expert/discover';
      const list = await api.get(endpoint);
      setResults(list);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className={`flex-1 bg-slate-50 dark:bg-slate-955 px-4 pt-4 w-full self-center ${isDesktop ? 'max-w-5xl' : 'max-w-2xl'}`} style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      {/* Search Input */}
      <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 mb-6 shadow-sm dark:shadow-none">
        <Search size={20} color={isDark ? '#94a3b8' : '#64748b'} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, bio, or startup headline..."
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
          autoCorrect={false}
        />
      </View>

      {/* Results Header */}
      <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
        {isLoading ? 'Searching...' : `Found ${results.length} experts`}
      </Text>

      {/* Results List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 justify-center items-center py-12">
          <Sparkles size={40} color={isDark ? '#475569' : '#94a3b8'} />
          <Text className="text-slate-500 dark:text-slate-450 text-base mt-3 text-center px-6">
            No experts match your search query. Try typing another term.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className={isDesktop ? "flex-row flex-wrap gap-4" : ""}>
            {results.map((expert) => (
              <TouchableOpacity
                key={expert._id}
                onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex-row items-center shadow-sm dark:shadow-none"
                style={isDesktop ? { width: '48.5%', marginBottom: 12 } : { marginBottom: 16 }}
              >
                <Image
                  source={{ uri: expert.avatarUrl || 'https://via.placeholder.com/150' }}
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-850"
                />
                <View className="flex-1 ml-4 pr-2">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">{expert.fullName}</Text>
                  <Text className="text-slate-550 dark:text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                    {expert.headline}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">{expert.ratingAverage.toFixed(1)}</Text>
                    <Text className="text-slate-455 dark:text-slate-500 text-xs ml-1">({expert.reviewsCount})</Text>
                  </View>
                </View>

                {/* Price Tags */}
                <View className="items-end">
                  <Text className="text-primary-600 dark:text-primary-400 font-bold text-sm">₦{expert.textQuestionPrice}</Text>
                  <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-0.5">Text Q&A</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
