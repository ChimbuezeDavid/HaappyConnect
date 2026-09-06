import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useColorScheme } from 'nativewind';
import { api } from '@/lib/api';
import { Search, Bell, Wallet, ShieldCheck, Sparkles, User, LogOut } from 'lucide-react-native';

export default function DesktopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isGuest } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const conversations = useChatStore((state) => state.conversations);
  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

  useEffect(() => {
    if (user && !isGuest) {
      api.get('/wallet/balance')
        .then((data) => {
          setWalletBalance(data?.availableBalance || 0);
        })
        .catch(() => {});
    }
  }, [user, isGuest, pathname]);

  const getSectionTitle = () => {
    if (pathname === '/' || pathname === '/(tabs)') {
      return user?.role === 'expert' ? 'Consultancy Dashboard' : 'Explore & Mentorship';
    }
    if (pathname.includes('search')) return 'Search Directory';
    if (pathname.includes('messages') || pathname.includes('chat')) return 'Communications & Chat';
    if (pathname.includes('bookings')) return user?.role === 'expert' ? 'Client Requests Queue' : 'My Scheduled Sessions';
    if (pathname.includes('wallet')) return 'Naira Wallet & Escrow Ledger';
    if (pathname.includes('profile')) return user?.role === 'expert' ? 'Consultancy Suite Settings' : 'My Space & Growth Goals';
    return 'HaappyConnect';
  };

  const isExpert = user?.role === 'expert';

  return (
    <View
      style={{
        height: 68,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        paddingHorizontal: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 30,
      }}
    >
      {/* 1. Left: Section Title & Breadcrumb */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <div>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: isDark ? '#F8FAFC' : '#0F172A',
              letterSpacing: -0.3,
            }}
          >
            {getSectionTitle()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isDark ? '#10B981' : '#059669',
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: isDark ? '#94A3B8' : '#64748B',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {isExpert ? 'Expert Advisory Suite' : 'Seeker Growth Hub'}
            </Text>
          </View>
        </div>
      </View>

      {/* 2. Center: Quick Search input */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/search')}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 8,
          width: 320,
          gap: 10,
        }}
      >
        <Search size={15} color={isDark ? '#94A3B8' : '#64748B'} />
        <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', flex: 1 }}>
          Search mentors, disciplines, skills...
        </Text>
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#E2E8F0',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#64748B' : '#64748B' }}>
            /
          </Text>
        </View>
      </TouchableOpacity>

      {/* 3. Right: Wallet Pill + Notifications + Profile Chip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Naira Balance Pill */}
        {!isGuest && walletBalance !== null && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/wallet')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#05966920' : '#ECFDF5',
              borderWidth: 1,
              borderColor: isDark ? '#05966940' : '#A7F3D0',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              gap: 8,
            }}
          >
            <Wallet size={14} color="#059669" />
            <View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: isDark ? '#10B981' : '#059669',
                  textTransform: 'uppercase',
                }}
              >
                {isExpert ? 'Earnings' : 'Balance'}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: isDark ? '#F8FAFC' : '#065F46',
                }}
              >
                ₦{walletBalance.toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Messages / Notifications Bell */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/messages')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Bell size={16} color={isDark ? '#F8FAFC' : '#334155'} />
          {totalUnread > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#059669',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>
                {totalUnread > 9 ? '9+' : totalUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Profile Chip */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0',
            paddingLeft: 4,
            paddingRight: 12,
            paddingVertical: 4,
            borderRadius: 9999,
            gap: 10,
          }}
        >
          <Image
            source={{
              uri:
                profile?.avatarUrl ||
                `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || user?.email || 'user'}`,
            }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: isDark ? '#334155' : '#E2E8F0',
            }}
          />
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
              numberOfLines={1}
            >
              {profile?.fullName || (isGuest ? 'Guest Preview' : user?.email?.split('@')[0])}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              {isExpert ? 'Verified Mentor' : 'Talent Seeker'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
