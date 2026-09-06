import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const processAuth = async () => {
      try {
        const {
          token,
          refreshToken,
          id,
          email,
          role,
          isOnboarded,
        } = params as Record<string, string>;

        console.log('[Auth Callback] Deep link parameters received:', {
          hasToken: !!token,
          email,
          role,
          isOnboarded,
        });

        if (!token) {
          if (active) {
            setError('No authentication token received.');
            setTimeout(() => {
              if (active) router.replace('/(auth)/login');
            }, 2000);
          }
          return;
        }

        const isUserOnboarded = isOnboarded === 'true';
        const userRole = (role as 'seeker' | 'expert') || 'seeker';

        // Update auth state in store and persistent secure storage
        await useAuthStore.getState().loginWithOAuth(
          token,
          refreshToken || null,
          {
            id: id || '',
            email: email || '',
            role: userRole,
            isOnboarded: isUserOnboarded,
          },
          null
        );

        if (active) {
          if (!isUserOnboarded) {
            router.replace('/(onboarding)/role-selection');
          } else {
            router.replace('/(tabs)');
          }
        }
      } catch (err: any) {
        console.error('[Auth Callback] Error finalizing login:', err);
        if (active) {
          setError(err.message || 'Authentication error.');
          setTimeout(() => {
            if (active) router.replace('/(auth)/login');
          }, 2500);
        }
      }
    };

    processAuth();

    return () => {
      active = false;
    };
  }, [params]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Happy Connect</Text>

        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.subText}>Redirecting back to login...</Text>
          </>
        ) : (
          <>
            <Text style={styles.statusText}>Finalizing your sign in...</Text>
            <ActivityIndicator size="small" color="#10b981" style={styles.indicator} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061431',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 360,
    width: '100%',
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#0d47a1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  indicator: {
    marginTop: 4,
  },
});
