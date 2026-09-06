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

function XIcon({ size = 18 }: { size?: number }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill={isDark ? '#e2e8f0' : '#0f172a'}
      />
    </Svg>
  );
}

function LinkedInIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"
        fill="#0A66C2"
      />
    </Svg>
  );
}

function AppleIcon({ size = 18 }: { size?: number }) {
  const isDark = useColorScheme().colorScheme === 'dark';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.62-.77 1.05-1.84.93-2.91-.94.04-2.04.64-2.69 1.41-.58.68-1.1 1.77-.96 2.82 1.05.08 2.1-.55 2.72-1.32z"
        fill={isDark ? '#e2e8f0' : '#0f172a'}
      />
    </Svg>
  );
}

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

  const handleOAuthLogin = async (provider: 'google' | 'x' | 'linkedin' | 'apple') => {
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
        const { token, refreshToken, id, email: oEmail, role, isOnboarded } = parsed.queryParams || {};
        
        if (token) {
          await useAuthStore.getState().loginWithOAuth(
            token as string,
            (refreshToken as string) || null,
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
              style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16, backgroundColor: 'transparent' }}
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
                <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600' }}>
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
              style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16, backgroundColor: 'transparent' }}
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
              backgroundColor: isFormValid ? '#059669' : (isDark ? '#05966940' : '#05966960'),
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
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  Create Account
                </Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Social logins */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#222D3D' : '#E7E1D8' }} />
            <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 13, marginHorizontal: 16, fontFamily: 'Inter_500Medium' }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#222D3D' : '#E7E1D8' }} />
          </View>

          {/* 4-provider Social Authentication Grid */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
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
                backgroundColor: isDark ? '#131A22' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                paddingVertical: 13,
                borderRadius: 14,
                minHeight: 50,
                gap: 8,
              }}
            >
              <GoogleIcon size={18} />
              <Text style={{ color: isDark ? '#f8fafc' : '#1e293b', fontWeight: '600', fontSize: 14 }}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOAuthLogin('linkedin')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign up with LinkedIn"
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#131A22' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                paddingVertical: 13,
                borderRadius: 14,
                minHeight: 50,
                gap: 8,
              }}
            >
              <LinkedInIcon size={18} />
              <Text style={{ color: isDark ? '#f8fafc' : '#1e293b', fontWeight: '600', fontSize: 14 }}>LinkedIn</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => handleOAuthLogin('apple')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign up with Apple"
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#131A22' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                paddingVertical: 13,
                borderRadius: 14,
                minHeight: 50,
                gap: 8,
              }}
            >
              <AppleIcon size={18} />
              <Text style={{ color: isDark ? '#f8fafc' : '#1e293b', fontWeight: '600', fontSize: 14 }}>Apple</Text>
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
                backgroundColor: isDark ? '#131A22' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                paddingVertical: 13,
                borderRadius: 14,
                minHeight: 50,
                gap: 8,
              }}
            >
              <XIcon size={16} />
              <Text style={{ color: isDark ? '#f8fafc' : '#1e293b', fontWeight: '600', fontSize: 14 }}>X (Twitter)</Text>
            </TouchableOpacity>
          </View>

          {/* Sign in link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: isDark ? '#64748b' : '#64748b', fontSize: 14 }}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: '#059669', fontWeight: '700', fontSize: 14 }}>Sign In</Text>
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
