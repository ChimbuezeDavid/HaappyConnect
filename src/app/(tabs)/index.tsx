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
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  SlidersHorizontal,
  Zap,
  CheckCircle2,
  Calendar,
  Wallet,
  Settings,
  ChevronRight,
  UserCheck
} from 'lucide-react-native';

export default function DiscoverScreen() {
  const { user, profile, isGuest } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [experts, setExperts] = useState<Profile[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
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
        return <Code size={18} color="#059669" />;
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

  const isExpert = user?.role === 'expert' && !isGuest;
  // Exclude current expert from discovery recommendations so they never see themselves
  const filteredExperts = isExpert && profile
    ? experts.filter(e => e._id !== profile._id && (e.user as any)?._id !== user?.id)
    : experts;
  const featuredExperts = filteredExperts.slice(0, 4);

  return (
    <View 
      className="flex-1" 
      style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}
    >
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{
          width: '100%',
          paddingHorizontal: isDesktop ? 32 : 18,
          paddingTop: isDesktop ? 20 : (insets.top > 0 ? insets.top + 4 : 10),
          paddingBottom: isDesktop ? 40 : 110,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TOP APP BAR: Greeting + Profile Trigger */}
        {!isDesktop && (
          <View className="flex-row justify-between items-center mb-5 px-0.5">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-extrabold">
                  Haappy-Connect
                </Text>
                {isExpert && (
                  <View className="bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/25 ml-2">
                    <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                      Expert Hub
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {getGreeting()}
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
        )}

        {/* ============================================================ */}
        {/* EXPERT WORKSPACE (NO NOISE - EXECUTIVE DASHBOARD)              */}
        {/* ============================================================ */}
        {isExpert ? (
          <View className="w-full">
            {/* Availability Status Card */}
            <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-5 shadow-sm dark:shadow-none">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2.5 shadow-sm shadow-emerald-500/50" />
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">
                    Consultancy Status
                  </Text>
                </View>
                <View className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase">
                    Active & Online
                  </Text>
                </View>
              </View>

              {/* Key Executive Metrics */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80"
                >
                  <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Open Inquiries
                  </Text>
                  <Text className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {pendingQuestions.length}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">Awaiting Answer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/wallet')}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80"
                >
                  <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Available Revenue
                  </Text>
                  <Text className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    ₦{earningsBalance.toLocaleString()}
                  </Text>
                  <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">Withdrawable</Text>
                </TouchableOpacity>
              </View>

              {/* Action Alert if questions are pending */}
              {pendingQuestions.length > 0 && (
                <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Zap size={16} color="#D97706" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {pendingQuestions.length} Consultation Question{pendingQuestions.length > 1 ? 's' : ''} Pending
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                      className="bg-primary-500 px-3.5 py-1.5 rounded-xl flex-row items-center"
                    >
                      <Text className="text-white font-bold text-xs">Answer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Management Suite */}
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
              Consultancy Commands
            </Text>
            <View className="space-y-2.5 mb-6">
              <TouchableOpacity
                onPress={() => router.push('/expert/availability')}
                activeOpacity={0.8}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="p-2.5 bg-primary-500/10 rounded-xl mr-3.5">
                    <Calendar size={20} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      Office Hours & Calendar
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Configure your weekly 1:1 call availability slots
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={isDark ? '#475569' : '#94a3b8'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/expert/verification')}
                activeOpacity={0.8}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="p-2.5 bg-amber-500/10 rounded-xl mr-3.5">
                    <ShieldCheck size={20} color="#D97706" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      Accreditation & Cross-Examination
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Submit ID and certifications for Verified Mentor badge
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={isDark ? '#475569' : '#94a3b8'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/expert/edit-profile')}
                activeOpacity={0.8}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="p-2.5 bg-blue-500/10 rounded-xl mr-3.5">
                    <UserCheck size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">
                      Advisory Rates & Profile
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Update Naira rates for text review and live calls
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={isDark ? '#475569' : '#94a3b8'} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ============================================================ */
          /* SEEKER & GUEST DISCOVERY EXPERIENCE                           */
          /* ============================================================ */
          <View className="w-full">
            {/* Search Bar */}
            {!isDesktop && (
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
            )}

            {/* Intelligently Redesigned Browse Categories */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Browse Domains
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text className="text-primary-600 dark:text-primary-400 text-xs font-extrabold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1 px-1">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: cat.slug } })}
                    activeOpacity={0.8}
                    style={{ width: 140 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl mr-3 shadow-sm dark:shadow-none"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        {getCategoryIcon(cat.slug)}
                      </View>
                      <View className="bg-primary-500/10 px-2 py-0.5 rounded-full">
                        <Text className="text-primary-600 dark:text-primary-400 text-[10px] font-bold">Top</Text>
                      </View>
                    </View>
                    <Text 
                      className="text-slate-900 dark:text-white font-bold text-xs" 
                      numberOfLines={2}
                      style={{ minHeight: 32 }}
                    >
                      {cat.name}
                    </Text>
                    <Text className="text-slate-400 text-[10px] mt-1">Explore mentors</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Seeker Welcome Value Card */}
            <View 
              className="rounded-3xl p-5 mb-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="bg-primary-500/15 p-2 rounded-xl mr-2.5">
                    <Sparkles size={18} color="#059669" />
                  </View>
                  <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                    Direct Expert Consultations
                  </Text>
                </View>
                <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Escrow Protected
                  </Text>
                </View>
              </View>
              <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Submit targeted questions for in-depth written reviews or book 1:1 live consultations directly on the mentor&apos;s calendar.
              </Text>
            </View>

            {/* Featured Experts */}
            {featuredExperts.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3 px-1">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Top Rated Mentors
                  </Text>
                  <Text className="text-slate-400 text-xs font-semibold">
                    {featuredExperts.length} Featured
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {featuredExperts.map((expert) => (
                    <TouchableOpacity
                      key={expert._id}
                      onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
                      activeOpacity={0.85}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 mr-4 shadow-sm dark:shadow-none"
                      style={{ width: isDesktop ? 280 : 250 }}
                    >
                      <View className="flex-row items-center mb-3">
                        <Image
                          source={{ uri: expert.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default' }}
                          className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mr-3"
                        />
                        <View className="flex-1">
                          <Text className="text-slate-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                            {expert.fullName}
                          </Text>
                          <Text className="text-slate-500 dark:text-slate-400 text-xs font-sans" numberOfLines={1}>
                            {expert.headline}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <View className="flex-row items-center">
                          <Award size={14} color="#F59E0B" />
                          <Text className="text-slate-800 dark:text-slate-200 text-xs font-bold ml-1">
                            {expert.ratingAverage.toFixed(1)}
                          </Text>
                          <Text className="text-slate-400 text-xs ml-0.5">({expert.reviewsCount})</Text>
                        </View>
                        <Text className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                          ₦{expert.textQuestionPrice.toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recommended For You */}
            <View className="mb-4">
              <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 px-1">
                Recommended For You
              </Text>
              {filteredExperts.slice(0, 6).map((expert) => (
                <ExpertCard
                  key={expert._id}
                  expert={expert}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
