import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, Profile, Question } from '@/types';
import ExpertCard from '@/components/ui/ExpertCard';
import { useColorScheme } from 'nativewind';
import {
  Sparkles,
  Search,
  Star,
  Code,
  Briefcase,
  TrendingUp,
  Award,
  DollarSign,
  Activity,
  Smile,
  Scale,
  Palette,
  Book,
  Home as HomeIcon,
  PenTool,
  Plus,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Inbox,
  Clock,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react-native';

export default function DiscoverScreen() {
  const { user, profile, isGuest } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [experts, setExperts] = useState<Profile[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cats, expertList] = await Promise.all([
        api.get('/expert/categories'),
        api.get('/expert/discover'),
      ]);
      setCategories(cats);
      setExperts(expertList);

      if (user?.role === 'expert' && !isGuest) {
        const [questionList, walletData] = await Promise.all([
          api.get('/question'),
          api.get('/wallet/balance'),
        ]);
        setPendingQuestions(questionList.filter((q: Question) => q.status === 'pending'));
        setEarningsBalance(walletData.availableBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching home screen data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isGuest]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'tech-ai':
        return <Code size={18} color="#8b5cf6" />;
      case 'business-entrepreneurship':
        return <Briefcase size={18} color="#3b82f6" />;
      case 'marketing-sales':
        return <TrendingUp size={18} color="#10b981" />;
      case 'finance-investment':
        return <DollarSign size={18} color="#06b6d4" />;
      case 'health-wellness':
        return <Activity size={18} color="#f43f5e" />;
      case 'career-development':
        return <Award size={18} color="#eab308" />;
      case 'personal-development':
        return <Smile size={18} color="#ec4899" />;
      case 'legal':
        return <Scale size={18} color="#a855f7" />;
      case 'design-creative':
        return <Palette size={18} color="#f97316" />;
      case 'education-academics':
        return <Book size={18} color="#38bdf8" />;
      case 'real-estate':
        return <HomeIcon size={18} color="#14b8a6" />;
      case 'writing-content':
        return <PenTool size={18} color="#f472b6" />;
      default:
        return <Sparkles size={18} color="#f59e0b" />;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    if (isGuest) return `${greet}, Guest`;
    return `${greet}, ${profile?.fullName?.split(' ')[0] || 'there'}`;
  };

  const featuredExperts = experts.slice(0, 4);
  const isExpert = user?.role === 'expert' && !isGuest;

  return (
    <View 
      className="flex-1 bg-slate-50 dark:bg-slate-955" 
      style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}
    >
      <ScrollView
        className={`flex-1 w-full self-center ${isDesktop ? 'max-w-5xl px-6' : 'max-w-2xl px-4'}`}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: isDesktop ? 20 : insets.top > 0 ? insets.top + 8 : 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TOP APP BAR: Greeting + Profile Trigger */}
        <View className="flex-row justify-between items-center mb-5 px-1">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-extrabold">
                Haappy-Connect
              </Text>
              {isExpert && (
                <View className="bg-violet-500/10 dark:bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/25 ml-2">
                  <Text className="text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase">
                    Expert Hub
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {getGreeting()} 👋
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
            className="p-1 rounded-full border-2 border-primary-500/30 dark:border-primary-400/30 bg-white dark:bg-slate-900 shadow-sm"
          >
            <Image
              source={{ 
                uri: isGuest 
                  ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'
                  : profile?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || 'user'}`
              }}
              className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800"
            />
          </TouchableOpacity>
        </View>

        {/* 2. INSTANT SEARCH BAR (Primary Discovery Action) */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.85}
          className="w-full flex-row items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-3.5 mb-5 shadow-sm dark:shadow-none"
        >
          <View className="flex-row items-center flex-1">
            <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-slate-400 dark:text-slate-500 text-sm ml-3">
              Search mentors, topics, skills...
            </Text>
          </View>
          <View className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <SlidersHorizontal size={14} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>
        </TouchableOpacity>

        {/* 3. CATEGORY PILLS STRIP (Instant 1-Tap Category Filters) */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Browse Categories
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text className="text-primary-600 dark:text-primary-400 text-xs font-extrabold flex-row items-center">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: cat.slug } })}
                activeOpacity={0.8}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl items-center mr-3 shadow-sm dark:shadow-none"
                style={{ width: 130 }}
              >
                <View className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl mb-2 border border-slate-100 dark:border-slate-800/80">
                  {getCategoryIcon(cat.slug)}
                </View>
                <Text className="text-slate-900 dark:text-white font-bold text-xs text-center" numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text className="text-slate-400 dark:text-slate-500 text-[10px] text-center mt-0.5">
                  Explore →
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading && !refreshing ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <>
            {/* 4. ROLE-SPECIFIC HERO OVERVIEW */}
            {isExpert ? (
              // Expert Management Hub
              <View className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm dark:shadow-none">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                      Consultation Overview
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      Real-time activity & earnings
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => router.push('/(tabs)/wallet')}
                    className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-black">
                      ₦{earningsBalance.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick metrics grid */}
                <View className="flex-row gap-3 mb-4">
                  <TouchableOpacity 
                    onPress={() => router.push('/(tabs)/bookings')}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850"
                  >
                    <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      Open Requests
                    </Text>
                    <Text className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">
                      {pendingQuestions.length}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => router.push('/expert/availability')}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850"
                  >
                    <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      Schedule
                    </Text>
                    <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1.5 flex-row items-center">
                      Manage Times →
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Pending Questions Quick Actions */}
                {pendingQuestions.length > 0 && (
                  <View className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">
                      ⚡ Action Required: {pendingQuestions.length} Question{pendingQuestions.length > 1 ? 's' : ''} waiting
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/bookings')}
                      className="bg-primary-500 py-2.5 rounded-xl items-center flex-row justify-center"
                    >
                      <Text className="text-white font-bold text-xs mr-1">Answer Now in Bookings</Text>
                      <ArrowRight size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Seeker / Guest Welcome Card
              <View 
                className="rounded-3xl p-5 mb-6 relative overflow-hidden border border-slate-200/80 dark:border-slate-800"
                style={{ backgroundColor: isDark ? '#061431' : '#ffffff' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="bg-primary-500/15 p-2 rounded-xl mr-2.5">
                      <Sparkles size={18} color="#8b5cf6" />
                    </View>
                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                      Direct Expert Access
                    </Text>
                  </View>
                  <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Verified Mentors
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-3">
                  Ask targeted text questions with guaranteed audio/written responses, or schedule 1:1 live video consultations.
                </Text>
              </View>
            )}

            {/* 5. FEATURED EXPERTS (Horizontal Spotlight) */}
            {featuredExperts.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3 px-1">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Top Rated Mentors
                  </Text>
                  <Text className="text-slate-400 dark:text-slate-500 text-xs">
                    {featuredExperts.length} Featured
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {featuredExperts.map((expert) => (
                    <TouchableOpacity
                      key={expert._id}
                      onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
                      activeOpacity={0.8}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl mr-4 shadow-sm dark:shadow-none flex-row items-center"
                      style={{ width: 280 }}
                    >
                      <Image
                        source={{ uri: expert.avatarUrl || 'https://via.placeholder.com/150' }}
                        className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800"
                      />
                      <View className="flex-1 ml-3.5 pr-1">
                        <Text className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
                          {expert.fullName}
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                          {expert.headline}
                        </Text>
                        
                        <View className="flex-row items-center mt-2 justify-between">
                          <View className="flex-row items-center">
                            <Star size={11} color="#f59e0b" fill="#f59e0b" />
                            <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">
                              {expert.ratingAverage.toFixed(1)}
                            </Text>
                            <Text className="text-slate-400 text-[10px] ml-1">
                              ({expert.reviewsCount})
                            </Text>
                          </View>
                          <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-xs">
                            ₦{expert.textQuestionPrice}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 6. ALL RECOMMENDED EXPERTS (Main Discovery Grid) */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Recommended For You
                </Text>
                <Text className="text-slate-400 dark:text-slate-500 text-xs">
                  {experts.length} Available
                </Text>
              </View>

              {experts.length === 0 ? (
                <View className="items-center justify-center py-12 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed">
                  <Text className="text-slate-500 dark:text-slate-400 text-sm">No experts found</Text>
                </View>
              ) : (
                <View className={isDesktop ? "flex-row flex-wrap gap-4" : "space-y-4"}>
                  {experts.map((expert) => (
                    <View 
                      key={expert._id} 
                      style={isDesktop ? { width: '48.5%', marginBottom: 12 } : undefined}
                    >
                      <ExpertCard expert={expert} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 7. FLOATING ACTION BUTTON (Expert Profile / Seeker Search Quick Action) */}
      <TouchableOpacity
        onPress={() => {
          if (isExpert) {
            router.push('/expert/edit-profile');
          } else {
            router.push('/(tabs)/search');
          }
        }}
        className="absolute right-6 bg-primary-500 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary-500 z-50"
        activeOpacity={0.85}
        style={{ bottom: 84 + insets.bottom }}
      >
        {isExpert ? (
          <Plus size={24} color="#fff" />
        ) : (
          <Search size={22} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}
