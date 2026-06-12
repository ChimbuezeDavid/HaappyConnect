import React, { useEffect } from 'react';
import { View, useWindowDimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Compass, Search, CalendarDays, Wallet, User, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useChatStore } from '@/store/chatStore';
import Sidebar from '@/components/ui/Sidebar';

export default function TabLayout() {
  const { user, token } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;

  const conversations = useChatStore((state) => state.conversations);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  return (
    <View 
      style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: isDark ? '#020617' : '#f8fafc' }} 
      className="bg-slate-50 dark:bg-slate-955"
    >
      {isDesktop && <Sidebar />}
      <View style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#8b5cf6', // primary 500
            tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
            tabBarStyle: isDesktop ? { display: 'none' } : {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
              height: 62 + insets.bottom,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              paddingTop: 8,
            },
            headerShown: !isDesktop, // Hide header on desktop
            headerStyle: {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              shadowColor: 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
            },
            headerTitleStyle: {
              color: isDark ? '#ffffff' : '#0f172a',
              fontWeight: 'bold',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Discover',
              tabBarLabel: 'Discover',
              tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
              headerTitle: 'Discover Experts',
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: 'Search',
              tabBarLabel: 'Search',
              tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
              headerTitle: 'Search',
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarLabel: 'Messages',
              tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
              headerTitle: 'Inbox',
              tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: 'Bookings',
              tabBarLabel: 'Bookings',
              tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
              headerTitle: user?.role === 'expert' ? 'Client Requests' : 'My Requests',
            }}
          />
          <Tabs.Screen
            name="wallet"
            options={{
              title: 'Wallet',
              tabBarLabel: 'Wallet',
              tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
              headerTitle: user?.role === 'expert' ? 'Earnings & Payouts' : 'My Wallet',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
              headerTitle: 'Account Settings',
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
