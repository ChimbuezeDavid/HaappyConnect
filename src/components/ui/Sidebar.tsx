import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import { useColorScheme } from 'nativewind';
import { 
  Compass, Search, MessageSquare, CalendarDays, Wallet, User, 
  LogOut, Sun, Moon, Laptop, ShieldCheck 
} from 'lucide-react-native';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const conversations = useChatStore((state) => state.conversations);
  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const navItems = [
    {
      label: 'Discover',
      path: '/',
      icon: Compass,
      isActive: pathname === '/' || pathname === '/(tabs)'
    },
    {
      label: 'Search',
      path: '/search',
      icon: Search,
      isActive: pathname === '/search' || pathname.startsWith('/(tabs)/search')
    },
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageSquare,
      isActive: pathname === '/messages' || pathname.startsWith('/chat'),
      badge: totalUnread > 0 ? totalUnread : undefined
    },
    {
      label: 'Bookings',
      path: '/bookings',
      icon: CalendarDays,
      isActive: pathname === '/bookings' || pathname.startsWith('/bookings/')
    },
    {
      label: 'Wallet',
      path: '/wallet',
      icon: Wallet,
      isActive: pathname === '/wallet' || pathname.startsWith('/(tabs)/wallet')
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: User,
      isActive: pathname === '/profile' || pathname.startsWith('/(tabs)/profile')
    }
  ];

  return (
    <View className="w-[260px] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 justify-between" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRightColor: isDark ? '#1e293b' : '#e2e8f0', borderRightWidth: 1 }}>
      {/* Brand Header */}
      <View>
        <View className="flex-row items-center mb-8 px-2">
          <View className="bg-primary-500 p-2 rounded-xl mr-3 shadow-md shadow-primary-500/20">
            <Compass size={20} color="#fff" />
          </View>
          <View>
            <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">Haappy-Connect</Text>
            <View className="flex-row items-center mt-0.5">
              <ShieldCheck size={10} color="#10b981" />
              <Text className="text-[9px] font-bold text-slate-450 dark:text-slate-500 ml-1 uppercase">Portal Secure</Text>
            </View>
          </View>
        </View>

        {/* Navigation Items */}
        <View className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-4 py-3 rounded-2xl mb-1.5 transition-colors ${
                  item.isActive
                    ? 'bg-primary-500/10 dark:bg-primary-500/15'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <View className="flex-row items-center">
                  <Icon 
                    size={18} 
                    color={item.isActive ? '#059669' : (isDark ? '#64748b' : '#94a3b8')} 
                  />
                  <Text className={`font-extrabold text-sm ml-3.5 ${
                    item.isActive 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {item.label}
                  </Text>
                </View>
                
                {item.badge !== undefined && (
                  <View className="bg-primary-600 dark:bg-primary-500 rounded-full px-2 py-0.5 min-w-[20px] justify-center items-center shadow-sm shadow-emerald-600/30">
                    <Text className="text-white text-[10px] font-black">{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer (Theme + Profile) */}
      <View className="space-y-6">
        {/* Theme Selectors */}
        <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-1.5 flex-row">
          {(['light', 'dark', 'system'] as const).map((mode) => {
            const isActive = theme === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setTheme(mode)}
                className={`flex-1 py-2 rounded-xl justify-center items-center ${
                  isActive ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                }`}
              >
                {mode === 'light' && <Sun size={14} color={isActive ? '#059669' : '#64748b'} />}
                {mode === 'dark' && <Moon size={14} color={isActive ? '#059669' : '#64748b'} />}
                {mode === 'system' && <Laptop size={14} color={isActive ? '#059669' : '#64748b'} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User Card */}
        {user && (
          <View className="border-t border-slate-200/80 dark:border-slate-800/80 pt-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 justify-center items-center border border-emerald-200 dark:border-emerald-800">
                <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  {(profile?.fullName || user?.email || 'User')
                    .split(' ')
                    .map((n: string) => n[0] || '')
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-slate-900 dark:text-white font-extrabold text-xs" numberOfLines={1}>
                  {profile?.fullName || user?.email || 'User'}
                </Text>
                <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold mt-0.5 tracking-wider">
                  {user.role}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleLogout}
              className="p-2 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 rounded-xl"
            >
              <LogOut size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
