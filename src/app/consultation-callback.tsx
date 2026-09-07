import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as WebBrowser from 'expo-web-browser';

// Notify Expo's WebBrowser handler if opened via openAuthSessionAsync
WebBrowser.maybeCompleteAuthSession();

export default function ConsultationCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const performVerification = async () => {
      const ref = (params.reference || params.trxref) as string;
      const statusParam = params.status as string;

      console.log('[Consultation Callback] Checking params:', { ref, statusParam });

      if (!ref) {
        if (active) {
          setStatus('failed');
          setErrorMessage('No payment reference found in callback.');
          setTimeout(() => {
            router.replace('/(tabs)/bookings');
          }, 3000);
        }
        return;
      }

      if (statusParam === 'failed') {
        if (active) {
          setStatus('failed');
          setErrorMessage('The transaction was cancelled or declined.');
          setTimeout(() => {
            router.replace('/(tabs)/bookings');
          }, 3000);
        }
        return;
      }

      try {
        const verifyRes = await api.post('/question/verify-payment', { reference: ref });
        if (active) {
          setStatus('success');

          const targetConversationId = verifyRes?.conversationId;

          // If on web and opened in a popup
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({ type: 'PAYSTACK_CONSULTATION_SUCCESS', reference: ref, conversationId: targetConversationId }, '*');
              window.close();
              return;
            } catch (_) {}
          }

          setTimeout(() => {
            if (targetConversationId) {
              router.replace({
                pathname: '/chat/[conversationId]',
                params: { conversationId: targetConversationId }
              });
            } else {
              router.replace('/(tabs)/bookings');
            }
          }, 1500);
        }
      } catch (err: any) {
        if (active) {
          setStatus('failed');
          setErrorMessage(err.message || 'Payment verification failed.');
          setTimeout(() => {
            router.replace('/(tabs)/bookings');
          }, 3500);
        }
      }
    };

    performVerification();

    return () => {
      active = false;
    };
  }, [params.reference, params.trxref, params.status]);

  const backgroundColor = isDark ? '#020617' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color="#059669" style={styles.spinner} />
            <Text style={[styles.title, { color: textColor }]}>Verifying Escrow Payment...</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>
              Please do not close this window. Connecting to your private consultation thread...
            </Text>
          </>
        )}
        {status === 'success' && (
          <>
            <View style={styles.iconWrapper}>
              <CheckCircle2 size={56} color="#059669" />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Payment Secured in Escrow</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>
              Opening your consultation thread...
            </Text>
          </>
        )}
        {status === 'failed' && (
          <>
            <View style={styles.iconWrapper}>
              <XCircle size={56} color="#ef4444" />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Payment Failed</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>
              {errorMessage || 'Something went wrong. Redirecting you back...'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  spinner: {
    marginBottom: 24,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
