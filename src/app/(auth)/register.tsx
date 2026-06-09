import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_URL } from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signup, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const passwordRef = useRef<TextInput>(null);
  const isFormValid = !!email && !!password && password.length >= 6;

  const handleOAuthLogin = async (provider: 'google' | 'x') => {
    try {
      clearError();
      const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
      const authUrl = `${baseUrl}/api/auth/${provider}`;
      
      const redirectUrl = Linking.createURL('auth-callback');
      console.log(`Starting OAuth session. Provider: ${provider}, URL: ${authUrl}, Redirect: ${redirectUrl}`);
      
      const result = await WebBrowser.openAuthSessionAsync(
        `${authUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { token, id, email: oEmail, role, isOnboarded } = parsed.queryParams || {};
        
        if (token) {
          await useAuthStore.getState().loginWithOAuth(
            token as string, 
            { id: id as string, email: oEmail as string, role: (role as 'seeker' | 'expert') || 'seeker', isOnboarded: isOnboarded === 'true' },
            null
          );
        }
      }
    } catch (e: any) {
      console.error(`OAuth login error with ${provider}:`, e);
    }
  };

  const handleRegister = useCallback(async () => {
    if (!isFormValid) return;
    try {
      await signup(email, password, 'seeker');
    } catch (e) {
      // Handled by store
    }
  }, [email, password, isFormValid, signup]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 24, paddingVertical: 48, maxWidth: 440, width: '100%', alignSelf: 'center' }}>

          {/* Header */}
          <View style={{ marginBottom: 32 }} accessible={true} accessibilityRole="header">
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: '#10b98120',
                borderWidth: 1,
                borderColor: '#10b98130',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Sparkles size={28} color="#10b981" />
            </View>
            <Text
              style={{
                fontSize: 30,
                fontWeight: '900',
                color: isDark ? '#fff' : '#0f172a',
                letterSpacing: -1,
                lineHeight: 36,
              }}
            >
              Create your{'\n'}account
            </Text>
            <Text style={{ fontSize: 15, color: isDark ? '#64748b' : '#475569', marginTop: 8, lineHeight: 22 }}>
              Join thousands connecting with experts on HaappyConnect.
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ef444415',
                borderWidth: 1,
                borderColor: '#ef444425',
                padding: 14,
                borderRadius: 14,
                marginBottom: 20,
              }}
              accessible={true}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <AlertCircle size={18} color="#ef4444" />
              <Text style={{ color: '#f87171', fontSize: 14, flex: 1, marginLeft: 10 }}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Email
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderWidth: 1.5,
              borderColor: emailFocused ? '#10b981' : (isDark ? '#1e293b' : '#cbd5e1'),
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 16,
            }}
          >
            <Mail size={18} color={emailFocused ? '#10b981' : (isDark ? '#475569' : '#94a3b8')} />
            <TextInput
              value={email}
              onChangeText={(t) => { clearError(); setEmail(t); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="name@example.com"
              placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel="Email address"
              style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16 }}
            />
          </View>

          {/* Password */}
          <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Password
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderWidth: 1.5,
              borderColor: passwordFocused ? '#10b981' : (isDark ? '#1e293b' : '#cbd5e1'),
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 8,
            }}
          >
            <Lock size={18} color={passwordFocused ? '#10b981' : (isDark ? '#475569' : '#94a3b8')} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(t) => { clearError(); setPassword(t); }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Min. 6 characters"
              placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={handleRegister}
              accessibilityLabel="Password"
              style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16 }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} color="#475569" /> : <Eye size={18} color="#475569" />}
            </TouchableOpacity>
          </View>

          {/* Password hint */}
          {password.length > 0 && password.length < 6 && (
            <Text style={{ color: '#f59e0b', fontSize: 12, marginBottom: 16, marginLeft: 2 }}>
              {6 - password.length} more character{6 - password.length !== 1 ? 's' : ''} needed
            </Text>
          )}
          {(password.length === 0 || password.length >= 6) && <View style={{ height: 16 }} />}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading || !isFormValid}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: isLoading || !isFormValid }}
            style={{
              backgroundColor: isFormValid ? '#10b981' : (isDark ? '#10b98140' : '#10b98160'),
              paddingVertical: 18,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              minHeight: 56,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 }}>
                  Create Account
                </Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Social logins */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
            <Text style={{ color: isDark ? '#475569' : '#64748b', fontSize: 13, marginHorizontal: 16 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
            <TouchableOpacity
              onPress={() => handleOAuthLogin('google')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Google"
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#1e293b' : '#cbd5e1',
                paddingVertical: 14,
                borderRadius: 14,
                minHeight: 52,
              }}
            >
              <Text style={{ color: isDark ? '#e2e8f0' : '#475569', fontWeight: '600', fontSize: 15 }}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOAuthLogin('x')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign up with X"
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#1e293b' : '#cbd5e1',
                paddingVertical: 14,
                borderRadius: 14,
                minHeight: 52,
              }}
            >
              <Text style={{ color: isDark ? '#e2e8f0' : '#475569', fontWeight: '600', fontSize: 15 }}>X (Twitter)</Text>
            </TouchableOpacity>
          </View>

          {/* Sign in link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: isDark ? '#475569' : '#64748b', fontSize: 14 }}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Guest */}
          <TouchableOpacity
            onPress={() => {
              useAuthStore.getState().setGuest(true);
              router.replace('/(tabs)');
            }}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              minHeight: 44,
            }}
          >
            <Text style={{ color: isDark ? '#334155' : '#64748b', fontSize: 14, fontWeight: '600' }}>
              Preview as Guest
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
