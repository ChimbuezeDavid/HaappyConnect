import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  ChevronLeft,
  LifeBuoy,
  Send,
  CheckCircle2,
  Mail,
  HelpCircle,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Zap
} from 'lucide-react-native';

const CATEGORIES = [
  { id: 'Consultations', label: 'Consultations & Bookings', icon: MessageSquare },
  { id: 'Billing & Wallet', label: 'Billing, Wallet & Payouts', icon: CreditCard },
  { id: 'Accreditation', label: 'Expert Accreditation', icon: ShieldCheck },
  { id: 'Technical Glitch', label: 'Technical Bug / Glitch', icon: Zap },
  { id: 'General Inquiry', label: 'General Inquiry & Feedback', icon: HelpCircle },
];

export default function SupportScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [name, setName] = useState(profile?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Validation Error', 'Please provide a subject for your inquiry.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Validation Error', 'Please provide detailed information in your message (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/support/ticket', {
        name: name.trim() || 'Haappy User',
        email: email.trim(),
        category: selectedCategory,
        subject: subject.trim(),
        message: message.trim(),
      });
      setIsSuccess(true);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not send support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Haappy Support
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Concierge help, questions & issue resolution
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 20,
            maxWidth: 680,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          {isSuccess ? (
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 items-center text-center my-8 shadow-sm">
              <View className="w-16 h-16 rounded-full bg-emerald-500/15 items-center justify-center mb-4">
                <CheckCircle2 size={36} color="#059669" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                Ticket Dispatched!
              </Text>
              <Text className="text-sm text-slate-600 dark:text-slate-300 text-center mb-6 leading-relaxed">
                Thank you for contacting us. A confirmation email has been dispatched via Resend to{' '}
                <Text className="font-bold text-emerald-600 dark:text-emerald-400">{email}</Text>.
                Our concierge team will review your inquiry and respond directly within 24 hours.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSuccess(false);
                  setSubject('');
                  setMessage('');
                  router.back();
                }}
                className="bg-emerald-600 py-3.5 px-8 rounded-2xl"
              >
                <Text className="text-white font-bold text-sm">Back to Haappy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Intro Banner */}
              <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex-row items-center">
                <LifeBuoy size={24} color="#059669" className="mr-3 flex-shrink-0" />
                <View className="flex-1 ml-2">
                  <Text className="text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    How can we assist you today?
                  </Text>
                  <Text className="text-emerald-700/80 dark:text-emerald-400/80 text-xs mt-0.5">
                    Select a topic below and tell us how we can help.
                  </Text>
                </View>
              </View>

              {/* Category Picker */}
              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                Topic Category
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Icon
                        size={14}
                        color={isSelected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                      />
                      <Text
                        className={`text-xs font-bold ml-2 ${
                          isSelected
                            ? 'text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name & Email Fields */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Chimbueze David"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-sm"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Contact Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-sm"
                />
              </View>

              {/* Subject Field */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Subject
                </Text>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Brief summary of your inquiry..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-sm"
                />
              </View>

              {/* Message Field */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Detailed Message
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Explain what happened, what you need help with, or any relevant transaction/booking details..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white text-sm min-h-[140px]"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 py-4 rounded-2xl items-center flex-row justify-center mb-8 shadow-sm"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text className="text-white font-bold text-base ml-2">
                      Send Support Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
