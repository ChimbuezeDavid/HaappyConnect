import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Category } from '@/types';
import { useColorScheme } from 'nativewind';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  DollarSign,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import AppScreen from '@/components/ui/AppScreen';
import Confetti from '@/components/ui/Confetti';

export default function ExpertApplyScreen() {
  const router = useRouter();
  const { user, profile, updateOnboarding, setViewMode } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  // Form State
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [experience, setExperience] = useState(profile?.experience || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    profile?.categories?.[0]?._id || ''
  );
  const [callPrice, setCallPrice] = useState(profile?.hourlyRate ? String(profile.hourlyRate) : '15000');
  const [textPrice, setTextPrice] = useState(profile?.textQuestionPrice ? String(profile.textQuestionPrice) : '2000');
  const [videoPrice, setVideoPrice] = useState(profile?.videoResponsePrice ? String(profile.videoResponsePrice) : '5000');
  const [availabilityImmediate, setAvailabilityImmediate] = useState(true);
  const [availabilityNote, setAvailabilityNote] = useState(profile?.availabilityNote || 'Available for bookings');

  // Categories list
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      try {
        const cats = await api.get('/expert/categories');
        setDbCategories(cats);
        if (!selectedCategory && cats.length > 0) {
          setSelectedCategory(cats[0]._id);
        }
      } catch (err) {
        console.error('Error fetching categories in expert application:', err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!headline.trim() || headline.trim().length < 5) {
        Alert.alert('Validation Required', 'Please enter a professional headline (minimum 5 characters).');
        return;
      }
      if (!bio.trim() || bio.trim().length < 20) {
        Alert.alert('Validation Required', 'Please share an advisory bio (minimum 20 characters) describing how you help clients.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedCategory) {
        Alert.alert('Selection Required', 'Please choose a primary category for your advisory practice.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    const numericCallPrice = Number(callPrice) || 0;
    const numericTextPrice = Number(textPrice) || 0;
    const numericVideoPrice = Number(videoPrice) || 0;

    if (numericCallPrice <= 0 && numericTextPrice <= 0) {
      Alert.alert('Pricing Required', 'Please set at least one advisory consultation fee.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        fullName: profile?.fullName || user?.email?.split('@')[0] || 'Expert',
        role: 'expert',
        headline: headline.trim(),
        bio: bio.trim(),
        experience: experience.trim(),
        categories: [selectedCategory],
        hourlyRate: numericCallPrice,
        textQuestionPrice: numericTextPrice,
        videoResponsePrice: numericVideoPrice,
        availabilityImmediate,
        availabilityNote: availabilityNote.trim(),
        visibility: 'Public',
      };

      await updateOnboarding(payload);
      setViewMode('expert');
      setShowConfetti(true);
      setIsSuccess(true);

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2500);
    } catch (err: any) {
      Alert.alert('Activation Failed', err.message || 'Could not activate expert profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? '#020617' : '#FFFFFF',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Confetti active={showConfetti} />
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#10B98120',
            borderWidth: 2,
            borderColor: '#10B98150',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <CheckCircle2 size={44} color="#10B981" />
        </View>
        <Text
          style={{
            fontSize: 26,
            fontFamily: 'PlusJakartaSans_700Bold',
            color: isDark ? '#F8FAFC' : '#0F172A',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Your Practice is Live!
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
            color: isDark ? '#94A3B8' : '#64748B',
            textAlign: 'center',
            maxWidth: 320,
            lineHeight: 22,
          }}
        >
          Welcome to the HaappyConnect Expert Network. Clients can now discover you in search, ask questions, and book 1:1 sessions.
        </Text>
      </View>
    );
  }

  return (
    <AppScreen
      scrollable={true}
      safeAreaEdges="both"
      contentContainerStyle={{
        maxWidth: 580,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
      }}
    >
      {/* Top Header & Back Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity
          onPress={handlePrev}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: isDark ? '#131A22' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                width: s === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: s === step ? '#059669' : s < step ? '#10B981' : isDark ? '#222D3D' : '#E2E8F0',
              }}
            />
          ))}
        </View>

        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B' }}>
          Step {step} of {totalSteps}
        </Text>
      </View>

      {/* Step 1: Professional Identity & Bio */}
      {step === 1 && (
        <View>
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F8FAFC' : '#0F172A',
                marginBottom: 6,
              }}
            >
              Professional Identity
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 20 }}>
              Help clients understand who you are and the distinct advisory guidance you provide.
            </Text>
          </View>

          {/* Headline Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Professional Headline *
            </Text>
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder="e.g. Senior Tech Lead & Startup Advisor"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </View>

          {/* Bio Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Advisory Bio & Overview *
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Describe your background, what you advise on, and how clients can prepare for a session with you..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: isDark ? '#F8FAFC' : '#0F172A',
                minHeight: 120,
              }}
            />
          </View>

          {/* Experience Summary */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Years of Experience / Credentials (Optional)
            </Text>
            <TextInput
              value={experience}
              onChangeText={setExperience}
              placeholder="e.g. 8+ years scaling fintech products, Ex-Founder"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </View>
        </View>
      )}

      {/* Step 2: Category of Expertise */}
      {step === 2 && (
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F8FAFC' : '#0F172A',
                marginBottom: 6,
              }}
            >
              Primary Practice Category
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 20 }}>
              Select the primary field where clients will discover your profile and book consultations.
            </Text>
          </View>

          {loadingCats ? (
            <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 32 }} />
          ) : (
            <View style={{ gap: 10, marginBottom: 24 }}>
              {dbCategories.map((cat) => {
                const isSelected = selectedCategory === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => setSelectedCategory(cat._id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 18,
                      backgroundColor: isSelected
                        ? (isDark ? '#10B98115' : '#ECFDF5')
                        : (isDark ? '#131A22' : '#FFFFFF'),
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? '#059669' : isDark ? '#222D3D' : '#E2E8F0',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: isSelected ? '#059669' : isDark ? '#1B2430' : '#F1F5F9',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Layers size={18} color={isSelected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontFamily: 'PlusJakartaSans_600SemiBold',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          }}
                        >
                          {cat.name}
                        </Text>
                        {cat.description ? (
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              color: isDark ? '#94A3B8' : '#64748B',
                              marginTop: 2,
                            }}
                          >
                            {cat.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? '#059669' : isDark ? '#334155' : '#CBD5E1',
                        backgroundColor: isSelected ? '#059669' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Step 3: Pricing & Rates */}
      {step === 3 && (
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F8FAFC' : '#0F172A',
                marginBottom: 6,
              }}
            >
              Consultation Rates (₦)
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 20 }}>
              Set your advisory fees in Nigerian Naira. You can update these anytime in your Consultancy Suite.
            </Text>
          </View>

          {/* 1:1 Call Rate */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1:1 Live Video Call Rate (per hour) *
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#10B981', marginRight: 6 }}>
                ₦
              </Text>
              <TextInput
                value={callPrice}
                onChangeText={setCallPrice}
                keyboardType="numeric"
                placeholder="15000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </View>
          </View>

          {/* Written Question Rate */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Written Advisory Question Price *
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#10B981', marginRight: 6 }}>
                ₦
              </Text>
              <TextInput
                value={textPrice}
                onChangeText={setTextPrice}
                keyboardType="numeric"
                placeholder="2000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </View>
          </View>

          {/* Video Response Rate */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Video Response Price (Async Video)
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#10B981', marginRight: 6 }}>
                ₦
              </Text>
              <TextInput
                value={videoPrice}
                onChangeText={setVideoPrice}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />
            </View>
          </View>

          {/* Availability Note */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Availability Schedule Note
            </Text>
            <TextInput
              value={availabilityNote}
              onChangeText={setAvailabilityNote}
              placeholder="e.g. Weekday evenings and Saturday mornings"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </View>
        </View>
      )}

      {/* Bottom Action Button */}
      <View style={{ marginTop: 12 }}>
        {step < totalSteps ? (
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#059669',
              paddingVertical: 16,
              borderRadius: 18,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, marginRight: 8 }}>
              Continue
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#059669',
              paddingVertical: 16,
              borderRadius: 18,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>
                  Launch Advisory Practice
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </AppScreen>
  );
}
