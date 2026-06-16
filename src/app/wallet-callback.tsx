import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWalletStore } from '@/store/walletStore';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function WalletCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyDeposit } = useWalletStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const performVerification = async () => {
      const ref = params.reference as string;
      const statusParam = params.status as string;

      console.log('[Wallet Callback] Checking params:', { ref, statusParam });

      if (!ref) {
        if (active) {
          setStatus('failed');
          setErrorMessage('No transaction reference found in callback.');
          setTimeout(() => {
            router.replace('/(tabs)/wallet');
          }, 3000);
        }
        return;
      }

      if (statusParam === 'failed') {
        if (active) {
          setStatus('failed');
          setErrorMessage('The transaction was cancelled or declined.');
          setTimeout(() => {
            router.replace('/(tabs)/wallet');
          }, 3000);
        }
        return;
      }

      try {
        await verifyDeposit(ref);
        if (active) {
          setStatus('success');
          
          try {
            const { useNotificationStore } = require('@/store/notificationStore');
            useNotificationStore.getState().addNotification({
              type: 'deposit_verified',
              title: 'Deposit Verified! ₦',
              body: 'Your wallet has been credited successfully.',
            });
          } catch (_) {}

          setTimeout(() => {
            router.replace('/(tabs)/wallet');
          }, 2000);
        }
      } catch (err: any) {
        if (active) {
          setStatus('failed');
          setErrorMessage(err.message || 'Deposit verification failed.');
          setTimeout(() => {
            router.replace('/(tabs)/wallet');
          }, 3500);
        }
      }
    };

    performVerification();

    return () => {
      active = false;
    };
  }, [params.reference, params.status]);

  const backgroundColor = isDark ? '#020617' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
            <Text style={[styles.title, { color: textColor }]}>Verifying Deposit...</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>Please do not close this window or navigate away.</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={64} color="#10b981" style={styles.icon} />
            <Text style={[styles.title, { color: textColor }]}>Payment Successful!</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>Your deposit has been verified. Redirecting you back to your wallet...</Text>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={64} color="#ef4444" style={styles.icon} />
            <Text style={[styles.title, { color: textColor }]}>Payment Failed</Text>
            <Text style={[styles.subtitle, { color: '#ef4444', fontWeight: '600' }]}>{errorMessage}</Text>
            <Text style={[styles.subsubtitle, { color: subTextColor }]}>Redirecting you back to your wallet...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  spinner: {
    marginBottom: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  subsubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
