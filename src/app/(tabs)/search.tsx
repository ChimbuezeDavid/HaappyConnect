import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Profile, Category } from '@/types';
import { Search, Star, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function SearchScreen() {
  const router = useRouter();
  const { category: urlCategory, query: urlQuery } = useLocalSearchParams<{ category?: string; query?: string }>();
  
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;

  // 1. Fetch categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const list = await api.get('/expert/categories');
        setCategories(list);
      } catch (error) {
        console.error('Error fetching categories in search:', error);
      }
    };
    fetchCats();
  }, []);

  // 2. Sync URL params (e.g. from index screen category click)
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory);
      setQuery('');
    } else if (urlQuery) {
      setQuery(urlQuery);
      setSelectedCategory('');
    } else {
      setSelectedCategory('');
      setQuery('');
    }
  }, [urlCategory, urlQuery]);

  // 3. Trigger search when query or selected category changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch(query, selectedCategory);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedCategory]);

  const handleSearch = async (searchVal: string, catSlug: string) => {
    setIsLoading(true);
    try {
      let endpoint = '/expert/discover?';
      const params: string[] = [];
      if (searchVal) params.push(`query=${encodeURIComponent(searchVal)}`);
      if (catSlug) params.push(`category=${encodeURIComponent(catSlug)}`);
      endpoint += params.join('&');

      const list = await api.get(endpoint);
      setResults(list);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View 
      className={`flex-1 bg-slate-50 dark:bg-slate-955 px-4 pt-4 w-full self-center ${isDesktop ? 'max-w-5xl' : 'max-w-2xl'}`} 
      style={{ backgroundColor: isDark ? '#020617' : '#f8fafc', paddingBottom: 80 }}
    >
      {/* Desktop Page Title Header */}
      {isDesktop && (
        <View className="mb-6 pt-4">
          <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-extrabold">Marketplace Discovery</Text>
          <Text className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Consult with industry professionals
          </Text>
        </View>
      )}

      {/* Search Input Container */}
      <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 mb-4 shadow-sm dark:shadow-none">
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

      {/* Category Pills Row */}
      <View className="mb-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity
            onPress={() => setSelectedCategory('')}
            activeOpacity={0.8}
            className={`px-4 py-2 rounded-full mr-2.5 border ${
              selectedCategory === ''
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text className={`font-bold text-xs ${selectedCategory === '' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat._id}
                onPress={() => setSelectedCategory(cat.slug)}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-full mr-2.5 border ${
                  isSelected
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
        {isLoading ? 'Searching...' : `Found ${results.length} experts`}
      </Text>

      {/* Results List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 justify-center items-center py-16">
          <Sparkles size={40} color={isDark ? '#475569' : '#94a3b8'} />
          <Text className="text-slate-500 dark:text-slate-400 text-base mt-3 text-center px-6">
            No experts match your search query. Try another term or category.
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
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                />
                <View className="flex-1 ml-4 pr-2">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">{expert.fullName}</Text>
                  <Text className="text-slate-550 dark:text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                    {expert.headline}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">{expert.ratingAverage.toFixed(1)}</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1">({expert.reviewsCount})</Text>
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
