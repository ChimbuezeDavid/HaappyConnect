import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Platform, Modal, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Profile, Category } from '@/types';
import { Search, Star, Sparkles, CheckCircle2, SlidersHorizontal, X, Check, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { getAvatarUrl } from '@/lib/avatar';

export default function SearchScreen() {
  const router = useRouter();
  const { category: urlCategory, query: urlQuery } = useLocalSearchParams<{ category?: string; query?: string }>();
  
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'speed' | 'price_low' | 'price_high'>('rating');

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Compute filtered and sorted results
  const filteredResults = useMemo(() => {
    let list = [...results];
    if (verifiedOnly) {
      list = list.filter((e) => e.isVerified);
    }
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0) || (b.reviewsCount || 0) - (a.reviewsCount || 0));
    } else if (sortBy === 'speed') {
      list.sort((a, b) => (a.avgResponseHours || 4) - (b.avgResponseHours || 4));
    } else if (sortBy === 'price_low') {
      list.sort((a, b) => (a.textQuestionPrice || 0) - (b.textQuestionPrice || 0));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.textQuestionPrice || 0) - (a.textQuestionPrice || 0));
    }
    return list;
  }, [results, verifiedOnly, sortBy]);

  const activeFiltersCount = (verifiedOnly ? 1 : 0) + (sortBy !== 'rating' ? 1 : 0);

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
      className={`flex-1 bg-slate-50 dark:bg-slate-955 pt-4 w-full ${isDesktop ? 'px-8' : 'px-4 max-w-2xl self-center'}`} 
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

      {/* Search Input & Filter Button Container */}
      <View className="flex-row items-center gap-2.5 mb-4">
        <View className="flex-1 flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 shadow-sm dark:shadow-none">
          <Search size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, bio, or startup headline..."
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} className="p-1">
              <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          className={`p-3.5 rounded-2xl border flex-row items-center justify-center relative ${
            activeFiltersCount > 0
              ? 'bg-emerald-500/10 border-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none'
          }`}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={20} color={activeFiltersCount > 0 ? '#059669' : isDark ? '#94a3b8' : '#64748b'} />
          {activeFiltersCount > 0 && (
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-2 right-2 border-2 border-white dark:border-slate-900" />
          )}
        </TouchableOpacity>
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
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {isLoading ? 'Searching...' : `Found ${filteredResults.length} experts`}
        </Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              setVerifiedOnly(false);
              setSortBy('rating');
            }}
          >
            <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">Reset filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator color="#059669" size="large" />
        </View>
      ) : filteredResults.length === 0 ? (
        <View className="flex-1 justify-center items-center py-16">
          <Sparkles size={40} color={isDark ? '#475569' : '#94a3b8'} />
          <Text className="text-slate-500 dark:text-slate-400 text-base mt-3 text-center px-6">
            No experts match your search or filter criteria.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className={isDesktop ? "flex-row flex-wrap gap-4" : ""}>
            {filteredResults.map((expert) => (
              <TouchableOpacity
                key={expert._id}
                onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex-row items-center shadow-sm dark:shadow-none"
                style={isDesktop ? { width: width >= 1440 ? '31.8%' : '48.5%', marginBottom: 16 } : { marginBottom: 16 }}
              >
                <Image
                  source={{ uri: getAvatarUrl(expert.avatarUrl, expert.fullName) }}
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                />
                <View className="flex-1 ml-4 pr-2">
                  <View className="flex-row items-center space-x-1">
                    <Text className="text-base font-bold text-slate-900 dark:text-white flex-shrink font-display" numberOfLines={1}>{expert.fullName}</Text>
                    {expert.isVerified && (
                      <CheckCircle2 size={14} color="#059669" fill="#10B981" />
                    )}
                  </View>
                  <Text className="text-slate-550 dark:text-slate-400 text-xs mt-0.5 font-sans" numberOfLines={1}>
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
                  <Text className="text-primary-600 dark:text-primary-400 font-bold text-sm">₦{(expert.textQuestionPrice || 0).toLocaleString()}</Text>
                  <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-0.5">Text Q&A</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Filter Dialog Modal with Outside Backdrop Dismiss */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterModalVisible(false)} />
          <View className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Filter & Sort</Text>
                <Text className="text-xs text-slate-400 mt-0.5">Refine mentor marketplace results</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Verified Mentors Toggle */}
            <TouchableOpacity
              onPress={() => setVerifiedOnly(!verifiedOnly)}
              activeOpacity={0.8}
              className="flex-row items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 mb-5"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="p-2 rounded-xl bg-emerald-500/10 mr-3">
                  <CheckCircle2 size={20} color="#059669" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">Verified Mentors Only</Text>
                  <Text className="text-xs text-slate-400">Show accredited & reviewed leaders</Text>
                </View>
              </View>
              <View
                className={`w-6 h-6 rounded-full border items-center justify-center ${
                  verifiedOnly ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {verifiedOnly && <Check size={14} color="#fff" />}
              </View>
            </TouchableOpacity>

            {/* Sort Options */}
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Sort By</Text>
            <View className="gap-2 mb-6">
              {[
                { id: 'rating', label: 'Highest Rated & Reviews', icon: Star },
                { id: 'speed', label: 'Fastest Response Speed', icon: Zap },
                { id: 'price_low', label: 'Question Price: Low to High', icon: Sparkles },
                { id: 'price_high', label: 'Question Price: High to Low', icon: Sparkles },
              ].map((opt) => {
                const isSelected = sortBy === opt.id;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSortBy(opt.id as any)}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 dark:bg-emerald-500/15'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <IconComponent size={16} color={isSelected ? '#059669' : isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 10 }} />
                      <Text
                        className={`text-sm font-bold ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color="#059669" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setVerifiedOnly(false);
                  setSortBy('rating');
                }}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 items-center"
              >
                <Text className="font-bold text-sm text-slate-600 dark:text-slate-400">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="flex-1 bg-emerald-600 py-3.5 rounded-2xl items-center shadow-md shadow-emerald-600/20"
              >
                <Text className="font-bold text-sm text-white">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
