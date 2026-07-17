import { useState, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Key, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isStep1Valid = !!email && email.includes('@');
  const isStep2Valid = !!code && code.length === 6 && !!password && password.length >= 6 && password === confirmPassword;

  const handleSendCode = async () => {
    if (!isStep1Valid) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(response.message || 'Verification code sent to your email.');
      setStep(2);
    } catch (e: any) {
      setError(e.message || 'Failed to send recovery code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isStep2Valid) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
      }
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword: password });
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'Failed to reset password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {/* Back button (Only for steps 1 and 2) */}
          {step !== 3 && (
            <TouchableOpacity
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  setError(null);
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <ArrowLeft size={18} color={isDark ? '#94a3b8' : '#475569'} />
              <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: isDark ? '#94a3b8' : '#475569' }}>
                Back to {step === 2 ? 'Email' : 'Login'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: step === 3 ? '#10b98120' : '#8b5cf620',
                borderWidth: 1,
                borderColor: step === 3 ? '#10b98130' : '#8b5cf630',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              {step === 3 ? (
                <CheckCircle2 size={28} color="#10b981" />
              ) : (
                <Key size={28} color="#8b5cf6" />
              )}
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
              {step === 1 && 'Reset your\npassword'}
              {step === 2 && 'Enter\nverification code'}
              {step === 3 && 'Password\nupdated!'}
            </Text>
            <Text style={{ fontSize: 15, color: isDark ? '#64748b' : '#475569', marginTop: 10, lineHeight: 22 }}>
              {step === 1 && "Enter the email associated with your account and we'll send a 6-digit code to reset your password."}
              {step === 2 && `We've sent a 6-digit code to ${email}. Enter the code and set your new password below.`}
              {step === 3 && 'Your password has been reset successfully. You can now sign in with your new credentials.'}
            </Text>
          </View>

          {/* Alert Error / Success */}
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
            >
              <AlertCircle size={18} color="#ef4444" />
              <Text style={{ color: '#f87171', fontSize: 14, flex: 1, marginLeft: 10 }}>{error}</Text>
            </View>
          )}

          {successMessage && step === 2 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#10b98115',
                borderWidth: 1,
                borderColor: '#10b98125',
                padding: 14,
                borderRadius: 14,
                marginBottom: 20,
              }}
            >
              <CheckCircle2 size={18} color="#10b981" />
              <Text style={{ color: '#34d399', fontSize: 14, flex: 1, marginLeft: 10 }}>{successMessage}</Text>
            </View>
          )}

          {/* Step 1 Form */}
          {step === 1 && (
            <View>
              <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Email Address
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
                  marginBottom: 28,
                }}
              >
                <Mail size={18} color={emailFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setError(null); setEmail(t); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="name@example.com"
                  placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="go"
                  onSubmitEditing={handleSendCode}
                  style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16 }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSendCode}
                disabled={isLoading || !isStep1Valid}
                activeOpacity={0.85}
                style={{
                  backgroundColor: isStep1Valid ? '#8b5cf6' : (isDark ? '#8b5cf640' : '#8b5cf660'),
                  paddingVertical: 18,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 }}>
                      Send Code
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2 Form */}
          {step === 2 && (
            <View>
              {/* Code */}
              <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                6-Digit Verification Code
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderWidth: 1.5,
                  borderColor: codeFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 20,
                }}
              >
                <Key size={18} color={codeFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={(t) => { setError(null); setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); }}
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                  placeholder="123456"
                  placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16, letterSpacing: code ? 4 : 0 }}
                />
              </View>

              {/* Password */}
              <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                New Password
              </Text>
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
                  marginBottom: 20,
                }}
              >
                <Lock size={18} color={passwordFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => { setError(null); setPassword(t); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16 }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {showPassword ? <EyeOff size={18} color="#475569" /> : <Eye size={18} color="#475569" />}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Confirm New Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderWidth: 1.5,
                  borderColor: confirmPasswordFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 28,
                }}
              >
                <Lock size={18} color={confirmPasswordFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  ref={confirmPasswordRef}
                  value={confirmPassword}
                  onChangeText={(t) => { setError(null); setConfirmPassword(t); }}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#334155' : '#94a3b8'}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={handleResetPassword}
                  style={{ flex: 1, color: isDark ? '#fff' : '#0f172a', marginLeft: 12, fontSize: 16 }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {showConfirmPassword ? <EyeOff size={18} color="#475569" /> : <Eye size={18} color="#475569" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading || !isStep2Valid}
                activeOpacity={0.85}
                style={{
                  backgroundColor: isStep2Valid ? '#8b5cf6' : (isDark ? '#8b5cf640' : '#8b5cf660'),
                  paddingVertical: 18,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 }}>
                      Reset Password
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3 Form (Success Screen) */}
          {step === 3 && (
            <View>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#10b981',
                  paddingVertical: 18,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 }}>
                  Go to Sign In
                </Text>
                <ArrowRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
