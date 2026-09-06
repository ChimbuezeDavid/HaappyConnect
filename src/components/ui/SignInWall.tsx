import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, LogIn, UserPlus, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useColorScheme } from 'nativewind';

export default function SignInWall() {
  const router = useRouter();
  const { setGuest } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSignIn = () => {
    router.replace('/(auth)/login' as any);
  };

  const handleRegister = () => {
    router.replace('/(auth)/register' as any);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      style={{ backgroundColor: isDark ? '#020617' : '#f8fafc', paddingHorizontal: 24, paddingVertical: 48 }}
    >
      <View
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#1e293b' : '#e2e8f0',
          borderRadius: 24,
          padding: 32,
          alignItems: 'center',
          maxWidth: 440,
          width: '100%',
          alignSelf: 'center',
          shadowColor: isDark ? 'transparent' : '#64748b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 12,
          elevation: isDark ? 0 : 2,
        }}
      >
        {/* Icon */}
        <View
          style={{
            backgroundColor: '#05966920',
            padding: 20,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#05966930',
            marginBottom: 24,
            position: 'relative',
          }}
        >
          <Lock size={36} color="#059669" />
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: '#05966925',
              padding: 4,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#05966930',
            }}
          >
            <Sparkles size={14} color="#34d399" />
          </View>
        </View>

        <Text
          style={{
            fontSize: 24,
            fontWeight: '900',
            color: isDark ? '#fff' : '#0f172a',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 12,
          }}
        >
          Sign In Required
        </Text>

        <Text
          style={{
            color: isDark ? '#94a3b8' : '#475569',
            textAlign: 'center',
            fontSize: 14,
            marginBottom: 32,
            lineHeight: 22,
          }}
        >
          Create an account or sign in to request meetings, submit questions, check your transactions
          wallet, and customize your professional profile settings.
        </Text>

        {/* Buttons */}
        <View style={{ width: '100%', gap: 12 }}>
          <TouchableOpacity
            onPress={handleSignIn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#059669',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 16,
              minHeight: 56,
            }}
          >
            <LogIn size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRegister}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? '#020617' : '#f1f5f9',
              borderWidth: 1,
              borderColor: isDark ? '#1e293b' : '#cbd5e1',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 16,
              minHeight: 56,
            }}
          >
            <UserPlus size={20} color={isDark ? '#cbd5e1' : '#475569'} style={{ marginRight: 8 }} />
            <Text style={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: '700', fontSize: 16 }}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)' as any)}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Continue as guest"
          style={{ marginTop: 24, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: isDark ? '#64748b' : '#475569', fontSize: 13, fontWeight: '600' }}>
            Continue browsing as Guest
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
