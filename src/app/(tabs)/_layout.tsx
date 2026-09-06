import React, { useEffect } from 'react';
import { View, Text, useWindowDimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Compass, Search, CalendarDays, Wallet, User, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useChatStore } from '@/store/chatStore';
import Sidebar from '@/components/ui/Sidebar';
import DesktopHeader from '@/components/ui/DesktopHeader';

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

  const isExpert = user?.role === 'expert';

  const activeColor = isDark ? '#10B981' : '#059669';
  const inactiveColor = isDark ? '#64748b' : '#94a3b8';
  const surfaceColor = isDark ? '#131A22' : '#FAF8F5';
  const borderColor = isDark ? '#222D3D' : '#E7E1D8';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';

  const renderTabLabel = (label: string) => (props: any) => (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      allowFontScaling={false}
      style={{
        color: props.color,
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
      }}
    >
      {label}
    </Text>
  );

  return (
    <View 
      style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }} 
    >
      {isDesktop && <Sidebar />}
      <View style={{ flex: 1, backgroundColor: isDark ? '#0B0F14' : '#FAF8F5', height: Platform.OS === 'web' && isDesktop ? ('100vh' as any) : undefined, overflow: isDesktop ? 'hidden' : undefined }}>
        {isDesktop && <DesktopHeader />}
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: activeColor,
            tabBarInactiveTintColor: inactiveColor,
            tabBarItemStyle: {
              paddingHorizontal: 0,
              paddingVertical: 2,
            },
            tabBarStyle: isDesktop ? { display: 'none' } : {
              backgroundColor: surfaceColor,
              borderTopColor: borderColor,
              borderTopWidth: 1,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              paddingTop: 6,
            },
            headerShown: !isDesktop, // Hide header on desktop
            headerStyle: {
              backgroundColor: surfaceColor,
              shadowColor: 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            },
            headerTitleStyle: {
              color: textColor,
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 17,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: isExpert ? 'Dashboard' : 'Explore',
              tabBarLabel: renderTabLabel(isExpert ? 'Dashboard' : 'Explore'),
              tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
              headerShown: false, // Index has its own top greeting header, prevent redundant Expl... bar
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              href: null,
              title: 'Search',
              tabBarLabel: renderTabLabel('Search'),
              tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
              headerTitle: 'Search',
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarLabel: renderTabLabel('Messages'),
              tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
              headerTitle: isExpert ? 'Client Messages' : 'Messages',
              tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: isExpert ? 'Queue' : 'Sessions',
              tabBarLabel: renderTabLabel(isExpert ? 'Queue' : 'Sessions'),
              tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
              headerTitle: isExpert ? 'Consultation Queue' : 'My Consultations',
            }}
          />
          <Tabs.Screen
            name="wallet"
            options={{
              title: isExpert ? 'Earnings' : 'Wallet',
              tabBarLabel: renderTabLabel(isExpert ? 'Earnings' : 'Wallet'),
              tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
              headerTitle: isExpert ? 'Earnings & Payouts (₦)' : 'Naira Wallet (₦)',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: isExpert ? 'Suite' : 'Space',
              tabBarLabel: renderTabLabel(isExpert ? 'Suite' : 'Space'),
              tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
              headerTitle: isExpert ? 'Consultancy Suite' : 'My Space & Growth',
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
