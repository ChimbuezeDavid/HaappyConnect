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
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_URL } from '@/lib/api';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const passwordRef = useRef<TextInput>(null);
  const isFormValid = !!email && !!password;

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

  const handleLogin = useCallback(async () => {
    if (!isFormValid) return;
    try {
      await login(email, password);
    } catch (e) {
      // Handled by store
    }
  }, [email, password, isFormValid, login]);

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
          <View style={{ marginBottom: 36 }} accessible={true} accessibilityRole="header">
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: '#8b5cf620',
                borderWidth: 1,
                borderColor: '#8b5cf630',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <LogIn size={28} color="#8b5cf6" />
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
              Welcome{'\n'}back
            </Text>
            <Text style={{ fontSize: 15, color: isDark ? '#64748b' : '#475569', marginTop: 8, lineHeight: 22 }}>
              Sign in to continue your journey with HaappyConnect.
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
              borderColor: emailFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 20,
            }}
          >
            <Mail size={18} color={emailFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              Password
            </Text>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={{ color: '#8b5cf6', fontSize: 13, fontWeight: '600' }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderWidth: 1.5,
              borderColor: passwordFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 28,
            }}
          >
            <Lock size={18} color={passwordFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(t) => { clearError(); setPassword(t); }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="••••••••"
              placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
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

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading || !isFormValid}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: isLoading || !isFormValid }}
            style={{
              backgroundColor: isFormValid ? '#8b5cf6' : (isDark ? '#8b5cf640' : '#8b5cf660'),
              paddingVertical: 18,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              minHeight: 56,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 }}>
                  Sign In
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
              accessibilityLabel="Sign in with Google"
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
                gap: 10,
              }}
            >
              <GoogleIcon size={18} />
              <Text style={{ color: isDark ? '#e2e8f0' : '#475569', fontWeight: '600', fontSize: 15 }}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOAuthLogin('x')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign in with X"
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

          {/* Sign up link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: isDark ? '#475569' : '#64748b', fontSize: 14 }}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Sign up"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 14 }}>Sign Up</Text>
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
