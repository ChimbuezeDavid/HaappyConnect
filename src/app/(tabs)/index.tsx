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
import { Category, Profile, Question, Booking } from '@/types';
import AvatarImage from '@/components/ui/AvatarImage';
import { useColorScheme } from 'nativewind';
import { getAvatarUrl } from '@/lib/avatar';
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
  UserCheck,
  Lock,
  MessageSquare,
  Clock,
  Video,
  ExternalLink,
  Power,
  Star
} from 'lucide-react-native';

export default function DiscoverScreen() {
  const { user, profile, isGuest, updateLocalProfile, activeViewMode } = useAuthStore();
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
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isAvailable = profile?.availabilityImmediate !== false;

  const handleToggleAvailability = async () => {
    if (isTogglingAvailability) return;
    const newStatus = !isAvailable;
    setIsTogglingAvailability(true);
    updateLocalProfile({ availabilityImmediate: newStatus });
    try {
      await api.patch('/profile/availability', { availabilityImmediate: newStatus });
    } catch (err) {
      console.error('Failed to update availability status:', err);
      updateLocalProfile({ availabilityImmediate: !newStatus });
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const fetchData = async () => {
    setFetchError(null);
    try {
      const [catsRes, expertListRes] = await Promise.allSettled([
        api.get('/expert/categories'),
        api.get('/expert/discover'),
      ]);

      let loadedCats = false;
      let loadedExperts = false;

      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) {
        setCategories(catsRes.value);
        loadedCats = true;
      }
      if (expertListRes.status === 'fulfilled' && Array.isArray(expertListRes.value)) {
        setExperts(expertListRes.value);
        loadedExperts = true;
      }

      if (!loadedCats && !loadedExperts) {
        const errorMsg = 
          catsRes.status === 'rejected' ? catsRes.reason?.message : 
          expertListRes.status === 'rejected' ? expertListRes.reason?.message : 
          'Database offline or waking up';
        setFetchError(errorMsg);
      }

      if (user?.role === 'expert' && !isGuest) {
        const [questionList, walletData, bookingList] = await Promise.all([
          api.get('/question').catch(() => []),
          api.get('/wallet/balance').catch(() => ({ availableBalance: 0, escrowBalance: 0 })),
          api.get('/booking').catch(() => []),
        ]);

        const pending = (questionList || []).filter((q: Question) => q.status === 'pending');
        const answered = (questionList || []).filter((q: Question) => q.status === 'answered');
        const completedBookings = (bookingList || []).filter((b: Booking) => b.status === 'completed');

        setPendingQuestions(pending);
        setEarningsBalance(walletData.availableBalance || 0);
        setEscrowBalance(walletData.escrowBalance || 0);
        setCompletedSessionsCount(answered.length + completedBookings.length);

        const now = Date.now();
        const upcoming = (bookingList || [])
          .filter((b: Booking) => (b.status === 'confirmed' || b.status === 'pending') && new Date(b.scheduledAt).getTime() > now - (60 * 60 * 1000))
          .sort((a: Booking, b: Booking) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setNextBooking(upcoming[0] || null);
      }
    } catch (error: any) {
      console.error('Error fetching home screen data:', error);
      setFetchError(error?.message || 'Failed to fetch data');
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

  const isExpert = user?.role === 'expert' && !isGuest && (activeViewMode ? activeViewMode === 'expert' : true);
  // Exclude current expert from discovery recommendations so they never see themselves
  const filteredExperts = isExpert && profile
    ? experts.filter(e => e._id !== profile._id && (e.user as any)?._id !== user?.id)
    : experts;

  // Category-based recommendation engine for seekers
  const seekerCategories = (profile?.categories || []).map((c: any) => 
    typeof c === 'string' ? c : c.slug || c.name || ''
  ).filter(Boolean);
  
  const seekerCategoryTitle = (profile?.categories && profile.categories.length > 0)
    ? (typeof profile.categories[0] === 'string' ? profile.categories[0] : (profile.categories[0] as any)?.name)
    : null;

  const getExpertPrimaryCategory = (exp: Profile) => {
    if (!exp.categories || exp.categories.length === 0) return null;
    const first = exp.categories[0];
    if (typeof first === 'string') {
      const found = categories.find(c => c.slug === first || c._id === first);
      return found?.name || first;
    }
    return (first as any)?.name || (first as any)?.slug || null;
  };

  // 1. Top Mentors (Strictly 10 slots, ranked by ratingAverage and review count)
  const topMentors = [...filteredExperts]
    .sort((a, b) => {
      if ((b.ratingAverage || 0) !== (a.ratingAverage || 0)) {
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      }
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    })
    .slice(0, 10);

  // 2. Recommended For You (Strictly 10 slots, prioritizing seeker interests and balance)
  const recommendedMentors = [...filteredExperts]
    .sort((a, b) => {
      const aMatches = seekerCategories.length > 0 && (a.categories || []).some((c: any) => {
        const slug = typeof c === 'string' ? c : c.slug || c.name || '';
        return seekerCategories.includes(slug);
      }) ? 1 : 0;
      const bMatches = seekerCategories.length > 0 && (b.categories || []).some((c: any) => {
        const slug = typeof c === 'string' ? c : c.slug || c.name || '';
        return seekerCategories.includes(slug);
      }) ? 1 : 0;

      if (bMatches !== aMatches) return bMatches - aMatches;

      const scoreA = (a.ratingAverage || 0) * 10 + Math.log2((a.reviewsCount || 0) + 1) * 2;
      const scoreB = (b.ratingAverage || 0) * 10 + Math.log2((b.reviewsCount || 0) + 1) * 2;
      return scoreB - scoreA;
    })
    .slice(0, 10);

  const renderMentorTile = (expert: Profile, rank?: number) => {
    const primaryCat = getExpertPrimaryCategory(expert);

    return (
      <TouchableOpacity
        key={expert._id}
        onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
        activeOpacity={0.85}
        style={{ width: isDesktop ? 220 : 190 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 mr-3.5 shadow-sm dark:shadow-none flex-col justify-between"
      >
        {/* Top meta row */}
        <View className="flex-row items-center justify-between mb-3">
          {rank !== undefined ? (
            <View
              className={`px-2.5 py-0.5 rounded-lg border ${
                rank === 1
                  ? 'bg-amber-500/15 border-amber-500/30'
                  : rank === 2
                  ? 'bg-slate-400/15 border-slate-400/30'
                  : rank === 3
                  ? 'bg-amber-700/15 border-amber-700/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Text
                className={`text-[10px] font-black ${
                  rank === 1
                    ? 'text-amber-500'
                    : rank === 2
                    ? 'text-slate-500 dark:text-slate-300'
                    : rank === 3
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                #{rank}
              </Text>
            </View>
          ) : (
            <View className="bg-primary-500/10 px-2 py-0.5 rounded-lg max-w-[110px]">
              <Text className="text-primary-700 dark:text-primary-400 text-[10px] font-bold" numberOfLines={1}>
                {primaryCat || 'Recommended'}
              </Text>
            </View>
          )}

          {expert.avgResponseHours ? (
            <View className="flex-row items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <Zap size={9} color="#059669" />
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
                ~{expert.avgResponseHours}h
              </Text>
            </View>
          ) : (
            <View className="w-1" />
          )}
        </View>

        {/* Center avatar + details */}
        <View className="items-center mb-3">
          <View className="relative">
            <AvatarImage
              avatarUrl={expert.avatarUrl}
              fullName={expert.fullName}
              className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
            {expert.isVerified && (
              <View className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                <CheckCircle2 size={13} color="#059669" />
              </View>
            )}
          </View>

          <Text 
            className="text-slate-900 dark:text-white font-bold text-sm text-center mt-2.5 w-full" 
            numberOfLines={1}
          >
            {expert.fullName}
          </Text>
          <Text 
            className="text-slate-500 dark:text-slate-400 text-[11px] text-center mt-0.5 w-full" 
            numberOfLines={1}
          >
            {expert.headline || 'Verified Consultant'}
          </Text>
        </View>

        {/* Bottom ratings and price */}
        <View className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text className="text-slate-800 dark:text-slate-200 text-xs font-bold ml-1">
              {expert.ratingAverage ? expert.ratingAverage.toFixed(1) : '5.0'}
            </Text>
            <Text className="text-slate-400 text-[10px] ml-0.5">
              ({expert.reviewsCount || 0})
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[9px] text-slate-400 font-semibold uppercase">From</Text>
            <Text className="text-emerald-600 dark:text-emerald-400 font-black text-xs">
              ₦{(expert.textQuestionPrice || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
                  uri: getAvatarUrl(
                    profile?.avatarUrl, 
                    isGuest ? 'Guest' : (profile?.fullName || user?.email || 'User')
                  )
                }}
                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* EXPERT WORKSPACE (EXECUTIVE COMMAND CENTER)                 */}
        {/* ============================================================ */}
        {isExpert ? (
          <View className="w-full space-y-6">
            {/* 1. CONSULTANCY AVAILABILITY SWITCH CARD */}
            <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-none">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View 
                    className={`w-3.5 h-3.5 rounded-full mr-3 ${
                      isAvailable ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'
                    }`} 
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-black text-slate-900 dark:text-white">
                        Consultancy Status
                      </Text>
                      <View className={`px-2.5 py-0.5 rounded-full border ${
                        isAvailable 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${
                          isAvailable ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          {isAvailable ? 'Online & Available' : 'Paused / Away'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isAvailable 
                        ? 'Accepting live 1:1 call bookings & paid written inquiries'
                        : 'New bookings temporarily paused. Existing sessions remain active'
                      }
                    </Text>
                  </View>
                </View>

                {/* Toggle Pill Button */}
                <TouchableOpacity
                  onPress={handleToggleAvailability}
                  disabled={isTogglingAvailability}
                  activeOpacity={0.8}
                  className={`w-14 h-8 rounded-full p-1 justify-center ${
                    isAvailable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <View 
                    className={`w-6 h-6 rounded-full bg-white shadow-md ${
                      isAvailable ? 'self-end' : 'self-start'
                    }`}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. EXECUTIVE TELEMETRY (2x2 KPI CARDS) */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Executive Telemetry
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {/* Available Revenue */}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/wallet')}
                  activeOpacity={0.85}
                  style={{ width: isDesktop ? '23.5%' : '48%' }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="p-2 rounded-xl bg-emerald-500/10">
                      <Wallet size={18} color="#059669" />
                    </View>
                    <ChevronRight size={14} color="#059669" />
                  </View>
                  <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Available Revenue
                  </Text>
                  <Text className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    ₦{earningsBalance.toLocaleString()}
                  </Text>
                  <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Ready to withdraw
                  </Text>
                </TouchableOpacity>

                {/* In Escrow */}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/wallet')}
                  activeOpacity={0.85}
                  style={{ width: isDesktop ? '23.5%' : '48%' }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="p-2 rounded-xl bg-amber-500/10">
                      <Lock size={18} color="#D97706" />
                    </View>
                    <ChevronRight size={14} color="#D97706" />
                  </View>
                  <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Escrow in Review
                  </Text>
                  <Text className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    ₦{escrowBalance.toLocaleString()}
                  </Text>
                  <Text className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    Locked in active sessions
                  </Text>
                </TouchableOpacity>

                {/* Open Inquiries */}
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                  activeOpacity={0.85}
                  style={{ width: isDesktop ? '23.5%' : '48%' }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="p-2 rounded-xl bg-indigo-500/10">
                      <MessageSquare size={18} color="#6366F1" />
                    </View>
                    {pendingQuestions.length > 0 && (
                      <View className="bg-indigo-500 px-1.5 py-0.5 rounded-full">
                        <Text className="text-[9px] font-black text-white">Action</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Open Inquiries
                  </Text>
                  <Text className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {pendingQuestions.length}
                  </Text>
                  <Text className={`text-[10px] font-semibold mt-0.5 ${
                    pendingQuestions.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>
                    {pendingQuestions.length > 0 ? 'Awaiting response' : 'Queue clear'}
                  </Text>
                </TouchableOpacity>

                {/* Completed Sessions */}
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'history' } } as any)}
                  activeOpacity={0.85}
                  style={{ width: isDesktop ? '23.5%' : '48%' }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="p-2 rounded-xl bg-sky-500/10">
                      <CheckCircle2 size={18} color="#0EA5E9" />
                    </View>
                    <ChevronRight size={14} color="#0EA5E9" />
                  </View>
                  <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Delivered Sessions
                  </Text>
                  <Text className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {completedSessionsCount}
                  </Text>
                  <Text className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                    Lifetime consultations
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. UPCOMING LIVE SESSION CARD */}
            <View>
              <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Upcoming Live Session
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'calls' } } as any)}
                >
                  <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    All Calls
                  </Text>
                </TouchableOpacity>
              </View>

              {nextBooking ? (
                <View className="bg-emerald-950/20 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-sm">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        Confirmed 1:1 Call
                      </Text>
                    </View>
                    <View className="bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                      <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {nextBooking.durationMinutes || 45} mins
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 items-center justify-center mr-3.5">
                      <Video size={22} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-900 dark:text-white">
                        {typeof nextBooking.seekerProfile?.fullName === 'string' 
                          ? nextBooking.seekerProfile.fullName 
                          : 'Client Consultation'}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(nextBooking.scheduledAt).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/bookings/call',
                      params: {
                        meetingLink: nextBooking.meetingLink || `haappy-${nextBooking._id}`,
                        durationMinutes: String(nextBooking.durationMinutes || 45),
                        partnerName: typeof nextBooking.seekerProfile?.fullName === 'string' ? nextBooking.seekerProfile.fullName : 'Client',
                        bookingId: nextBooking._id,
                        expertId: typeof nextBooking.expert === 'string' ? nextBooking.expert : (nextBooking.expert as any)?._id || user?.id || ''
                      }
                    })}
                    activeOpacity={0.85}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center shadow-sm"
                  >
                    <Video size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-sm">Join Video Call Room</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-none flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3.5">
                      <Calendar size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">
                        No Live Calls Today
                      </Text>
                      <Text className="text-xs text-slate-400 mt-0.5">
                        Your schedule is clear. Check your weekly hours.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/expert/availability')}
                    className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl"
                  >
                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Hours</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 4. PRIORITY CLIENT INQUIRIES */}
            <View>
              <View className="flex-row items-center justify-between mb-3 px-1">
                <View className="flex-row items-center">
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Priority Client Inquiries
                  </Text>
                  {pendingQuestions.length > 0 && (
                    <View className="bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {pendingQuestions.length} Awaiting
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                >
                  <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    View Queue
                  </Text>
                </TouchableOpacity>
              </View>

              {pendingQuestions.length > 0 ? (
                <View className="space-y-3">
                  {pendingQuestions.slice(0, 3).map((q) => (
                    <View 
                      key={q._id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="w-8 h-8 rounded-full bg-primary-500/10 items-center justify-center mr-2.5">
                            <Text className="text-primary-700 dark:text-primary-400 text-xs font-bold">
                              {q.seekerProfile?.fullName?.charAt(0) || 'S'}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                              {q.seekerProfile?.fullName || 'Client Inquiry'}
                            </Text>
                            <Text className="text-[10px] text-slate-400">
                              {q.type === 'video' ? 'Video Question' : 'Written Advice'}
                            </Text>
                          </View>
                        </View>
                        <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <Text className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            ₦{q.price.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <Text 
                        className="text-xs text-slate-600 dark:text-slate-300 mb-3" 
                        numberOfLines={2}
                      >
                        "{q.seekerContent}"
                      </Text>

                      <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <View className="flex-row items-center">
                          <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                          <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            SLA: 48h Response
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                          className="bg-primary-600 px-3.5 py-1.5 rounded-xl flex-row items-center"
                        >
                          <Zap size={12} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text className="text-white font-bold text-xs">Answer (₦{q.price.toLocaleString()})</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {pendingQuestions.length > 3 && (
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(tabs)/bookings', params: { tab: 'questions' } } as any)}
                      className="py-2.5 items-center"
                    >
                      <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                        + {pendingQuestions.length - 3} more questions in queue
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 items-center shadow-sm dark:shadow-none">
                  <View className="w-12 h-12 rounded-full bg-emerald-500/10 items-center justify-center mb-3">
                    <ShieldCheck size={26} color="#059669" />
                  </View>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white text-center">
                    Consultation Queue Clear
                  </Text>
                  <Text className="text-xs text-slate-400 text-center mt-1 max-w-xs">
                    All client questions are addressed. Outstanding response SLA is 100%.
                  </Text>
                </View>
              )}
            </View>

            {/* 5. CONSULTANCY COMMANDS */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Consultancy Commands
              </Text>
              <View className="space-y-2.5">
                <TouchableOpacity
                  onPress={() => router.push('/expert/availability')}
                  activeOpacity={0.8}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="p-2.5 bg-emerald-500/10 rounded-xl mr-3.5">
                      <Calendar size={20} color="#059669" />
                    </View>
                    <View className="flex-1">
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
                  onPress={() => router.push('/expert/edit-profile')}
                  activeOpacity={0.8}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="p-2.5 bg-blue-500/10 rounded-xl mr-3.5">
                      <DollarSign size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">
                        Advisory Rates & Services
                      </Text>
                      <Text className="text-xs text-slate-400">
                        Update Naira rates for text review and live calls
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
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="p-2.5 bg-amber-500/10 rounded-xl mr-3.5">
                      <ShieldCheck size={20} color="#D97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">
                        Accreditation & Cross-Examination
                      </Text>
                      <Text className="text-xs text-slate-400">
                        Submit credentials for Verified Mentor badge
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={isDark ? '#475569' : '#94a3b8'} />
                </TouchableOpacity>

                {profile?._id && (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: `/expert/[id]`, params: { id: profile._id } })}
                    activeOpacity={0.8}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="p-2.5 bg-purple-500/10 rounded-xl mr-3.5">
                        <ExternalLink size={20} color="#A855F7" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">
                          Public Profile Preview
                        </Text>
                        <Text className="text-xs text-slate-400">
                          See your profile exactly as seekers discover you
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={isDark ? '#475569' : '#94a3b8'} />
                  </TouchableOpacity>
                )}
              </View>
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

            {/* Reconnect / Error Alert Banner */}
            {fetchError && (
              <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5 flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                    Connecting to Database
                  </Text>
                  <Text className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                    Server is waking up. Tap retry to load mentors.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsLoading(true);
                    fetchData();
                  }}
                  className="bg-emerald-600 px-3.5 py-2 rounded-xl"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-xs">Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 1. Browse Domains */}
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

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 2 }}
                className="flex-row"
              >
                {categories.map((cat, idx) => (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: cat.slug } })}
                    activeOpacity={0.8}
                    style={{ width: 145, height: 136 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl mr-3 shadow-sm dark:shadow-none justify-between flex-col"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        {getCategoryIcon(cat.slug)}
                      </View>
                      {idx < 2 && (
                        <View className="bg-primary-500/10 px-2 py-0.5 rounded-full">
                          <Text className="text-primary-600 dark:text-primary-400 text-[10px] font-bold">Top</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1 justify-center">
                      <Text 
                        className="text-slate-900 dark:text-white font-bold text-xs leading-snug" 
                        numberOfLines={2}
                      >
                        {cat.name}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mt-1 font-medium">Explore mentors</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 2. Top Mentors (Strictly 10 Slots with Rank Badges) */}
            {topMentors.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3 px-1">
                  <View className="flex-row items-center">
                    <Award size={15} color="#F59E0B" />
                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider ml-1.5">
                      Top Mentors
                    </Text>
                    <View className="bg-amber-500/10 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Top {topMentors.length}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { sort: 'top_rated' } })}>
                    <Text className="text-primary-600 dark:text-primary-400 text-xs font-extrabold">
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 2 }}
                  className="flex-row"
                >
                  {topMentors.map((expert, idx) => renderMentorTile(expert, idx + 1))}
                </ScrollView>
              </View>
            )}

            {/* 3. Seeker Welcome Value Card */}
            <View 
              className="rounded-3xl p-4 sm:p-5 mb-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none"
            >
              <View className="flex-row items-center justify-between gap-2 mb-2.5">
                <View className="flex-row items-center flex-1 mr-1">
                  <View className="bg-primary-500/15 p-2 rounded-xl mr-2.5 shrink-0">
                    <Sparkles size={18} color="#059669" />
                  </View>
                  <Text 
                    className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Expert Consultations
                  </Text>
                </View>
                <View className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Escrow Protected
                  </Text>
                </View>
              </View>
              <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Submit targeted questions for in-depth written reviews or book 1:1 live consultations directly on the mentor&apos;s calendar.
              </Text>
            </View>

            {/* 4. Recommended For You (Strictly 10 Slots) */}
            {recommendedMentors.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3 px-1">
                  <View className="flex-row items-center">
                    <Sparkles size={15} color="#059669" />
                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider ml-1.5">
                      {seekerCategoryTitle ? `Recommended in ${seekerCategoryTitle}` : 'Recommended For You'}
                    </Text>
                    <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {recommendedMentors.length} Slots
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { sort: 'recommended' } })}>
                    <Text className="text-primary-600 dark:text-primary-400 text-xs font-extrabold">
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 2 }}
                  className="flex-row"
                >
                  {recommendedMentors.map((expert) => renderMentorTile(expert))}
                </ScrollView>
              </View>
            )}

            {/* Empty state fallback if database has no mentors */}
            {filteredExperts.length === 0 && !isLoading && (
              <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 items-center justify-center my-4">
                <View className="w-12 h-12 rounded-full bg-emerald-500/10 items-center justify-center mb-3">
                  <Sparkles size={24} color="#059669" />
                </View>
                <Text className="text-slate-900 dark:text-white font-bold text-sm text-center">
                  Mentors Coming Soon
                </Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs text-center mt-1 max-w-xs">
                  We are currently onboarding verified mentors. Check back shortly.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
