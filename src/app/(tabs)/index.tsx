import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
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
  Compass,
  Search,
  Star,
  MessageSquare,
  PhoneCall,
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
  UserCheck,
  Eye
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DiscoverScreen() {
  const { user, profile, isGuest, logout } = useAuthStore();
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
      // Fetch categories & experts (all roles can view these)
      const [cats, expertList] = await Promise.all([
        api.get('/expert/categories'),
        api.get('/expert/discover'),
      ]);
      setCategories(cats);
      setExperts(expertList);

      // If expert, fetch pending questions and earnings balance
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
        return <Code size={20} color="#8b5cf6" />;
      case 'business-entrepreneurship':
        return <Briefcase size={20} color="#3b82f6" />;
      case 'marketing-sales':
        return <TrendingUp size={20} color="#10b981" />;
      case 'finance-investment':
        return <DollarSign size={20} color="#06b6d4" />;
      case 'health-wellness':
        return <Activity size={20} color="#f43f5e" />;
      case 'career-development':
        return <Award size={20} color="#eab308" />;
      case 'personal-development':
        return <Smile size={20} color="#ec4899" />;
      case 'legal':
        return <Scale size={20} color="#a855f7" />;
      case 'design-creative':
        return <Palette size={20} color="#f97316" />;
      case 'education-academics':
        return <Book size={20} color="#38bdf8" />;
      case 'real-estate':
        return <HomeIcon size={20} color="#14b8a6" />;
      case 'writing-content':
        return <PenTool size={20} color="#f472b6" />;
      default:
        return <Sparkles size={20} color="#f59e0b" />;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    if (isGuest) return `${greet}, Guest`;
    return `${greet}, ${profile?.fullName?.split(' ')[0] || 'there'}`;
  };

  const featuredExperts = experts.slice(0, 3);
  const trendingExperts = experts;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <ScrollView
        className={`flex-1 w-full self-center ${isDesktop ? 'max-w-5xl px-6' : 'max-w-2xl px-4'}`}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: isDesktop ? 20 : 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        {/* Personalized Header */}
        <View className="px-4 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 mb-6 flex-row justify-between items-center shadow-sm dark:shadow-none">
          <View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Haappy-Connect</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {getGreeting()} 👋
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/profile')}
            className="border-2 border-primary-500/20 p-0.5 rounded-full"
          >
            <Image
              source={{ 
                uri: isGuest 
                  ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'
                  : profile?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || 'user'}`
              }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800"
            />
          </TouchableOpacity>
        </View>

        {isLoading && !refreshing ? (
          <View className="py-24 justify-center items-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <View className="px-4">
            
            {/* HERO CTA BANNER */}
            {user?.role === 'expert' && !isGuest ? (
              // Expert Hero
              <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-violet-500/20 rounded-3xl p-6 mb-8 shadow-sm dark:shadow-xl">
                <Text className="text-slate-900 dark:text-white font-extrabold text-lg mb-1">New Requests Waiting</Text>
                <Text className="text-slate-500 dark:text-slate-350 text-xs mb-4">Provide immediate consultations to grow your metrics.</Text>
                
                <View className="flex-row space-x-3 justify-between">
                  <View className="flex-1 bg-slate-100/85 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 mr-2">
                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Open Requests</Text>
                    <Text className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">{pendingQuestions.length}</Text>
                  </View>
                  <View className="flex-1 bg-slate-100/85 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-850">
                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Earnings</Text>
                    <Text className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₦{earningsBalance}</Text>
                  </View>
                </View>
              </View>
            ) : (
              // Seeker / Guest Hero
              <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-violet-500/20 rounded-3xl p-6 mb-8 shadow-sm dark:shadow-xl">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-slate-900 dark:text-white font-extrabold text-lg">Find Your Expert Today</Text>
                  <Sparkles size={18} color="#8b5cf6" />
                </View>
                <Text className="text-slate-600 dark:text-slate-300 text-xs mb-4">Direct, paid Q&A sessions and live calls with top professionals.</Text>
                
                {/* Search redirection bar */}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/search')}
                  className="w-full flex-row items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 shadow-inner"
                >
                  <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text className="text-slate-500 text-xs ml-3">Search name, topic or keywords...</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pending Client Requests (For Experts Only) */}
            {user?.role === 'expert' && !isGuest && (
              <View className="mb-8">
                <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-4">Pending Client Requests</Text>
                
                {pendingQuestions.length === 0 ? (
                  <View className="items-center justify-center py-10 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed">
                    <Inbox size={32} color={isDark ? '#64748b' : '#94a3b8'} />
                    <Text className="text-slate-500 dark:text-slate-400 mt-2 text-sm">All caught up! No open requests.</Text>
                  </View>
                ) : (
                  pendingQuestions.map((q) => (
                    <View key={q._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-3xl mb-4 shadow-sm dark:shadow-none">
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center">
                          <Text className="text-slate-900 dark:text-white font-bold text-sm">Seeker Client</Text>
                          <View className="bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20 ml-2">
                            <Text className="text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase">{q.type}</Text>
                          </View>
                        </View>
                        <Text className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">₦{q.price}</Text>
                      </View>
                      
                      <Text className="text-slate-600 dark:text-slate-300 text-xs mb-4 leading-relaxed" numberOfLines={2}>
                        "{q.seekerContent}"
                      </Text>

                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/bookings')}
                        className="bg-primary-500 py-2.5 rounded-xl items-center"
                      >
                        <Text className="text-white font-bold text-xs">Answer Request</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Search redirection bar for Experts */}
            {user?.role === 'expert' && !isGuest && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/search')}
                className="w-full flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 mb-8 shadow-sm dark:shadow-none"
              >
                <Search size={16} color={isDark ? '#64748b' : '#94a3b8'} />
                <Text className="text-slate-500 text-xs ml-3">Search name, topic or keywords...</Text>
              </TouchableOpacity>
            )}

            {/* Browse Categories */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider">Browse Categories</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text className="text-primary-500 dark:text-primary-400 text-xs font-semibold">View All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: cat.slug } })}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl items-center justify-center mr-3 shadow-sm"
                    style={{ width: 140 }}
                  >
                    <View className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl mb-2 border border-slate-200 dark:border-slate-800/80">
                      {getCategoryIcon(cat.slug)}
                    </View>
                    <Text className="text-slate-800 dark:text-white font-bold text-xs text-center" numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Featured Experts Carousel */}
            {featuredExperts.length > 0 && (
              <View className="mb-8">
                <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-4">Featured Experts</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {featuredExperts.map((expert) => (
                    <TouchableOpacity
                      key={expert._id}
                      onPress={() => router.push({ pathname: '/expert/[id]', params: { id: expert._id } })}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl mr-4 shadow-sm dark:shadow-xl flex-row items-center"
                      style={{ width: 280 }}
                    >
                      <Image
                        source={{ uri: expert.avatarUrl || 'https://via.placeholder.com/150' }}
                        className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800"
                      />
                      <View className="flex-1 ml-4 pr-1">
                        <Text className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
                          {expert.fullName}
                        </Text>
                        <Text className="text-slate-550 dark:text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>
                          {expert.headline}
                        </Text>
                        
                        <View className="flex-row items-center mt-2 justify-between">
                          <View className="flex-row items-center">
                            <Star size={10} color="#f59e0b" fill="#f59e0b" />
                            <Text className="text-slate-900 dark:text-white text-[10px] font-bold ml-1">{expert.ratingAverage.toFixed(1)}</Text>
                          </View>
                          <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-xs">
                            ₦{expert.textQuestionPrice} Ask
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recommended Experts list */}
            <View className="mb-6">
              <Text className="text-slate-500 dark:text-slate-350 text-xs font-semibold uppercase tracking-wider mb-4">Recommended for You</Text>
              {trendingExperts.length === 0 ? (
                <View className="items-center justify-center py-12 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-850 border-dashed">
                  <Text className="text-slate-500 dark:text-slate-400 text-sm">No experts found</Text>
                </View>
              ) : (
                <View className={isDesktop ? "flex-row flex-wrap gap-4" : "space-y-4"}>
                  {trendingExperts.map((expert) => (
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
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity
        onPress={() => {
          if (user?.role === 'expert' && !isGuest) {
            router.push('/expert/edit-profile');
          } else {
            router.push('/(tabs)/search');
          }
        }}
        className="absolute right-6 bg-primary-500 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary-500 z-50"
        activeOpacity={0.8}
        style={{ bottom: 76 + insets.bottom }}
      >
        {user?.role === 'expert' && !isGuest ? (
          <Plus size={24} color="#fff" />
        ) : (
          <Search size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}
