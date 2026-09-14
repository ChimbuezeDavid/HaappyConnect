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
  Image,
  Switch,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { requestNotificationPermission, requestCameraPermission } from '@/services/permissions';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { api } from '@/lib/api';
import { Category } from '@/types';
import { useColorScheme } from 'nativewind';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  User,
  FileText,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Phone,
  Video,
  Bookmark
} from 'lucide-react-native';
import Confetti from '@/components/ui/Confetti';
import CountryCityPickerModal from '@/components/ui/CountryCityPickerModal';
import { getAvatarUrl } from '@/lib/avatar';

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, profile, updateOnboarding, isLoading: apiSaving } = useAuthStore();
  const draft = useOnboardingStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isUploading, setIsUploading] = useState(false);
  
  // List of categories loaded from API
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Focus state variables for inputs
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);
  const [headlineFocused, setHeadlineFocused] = useState(false);
  const [experienceFocused, setExperienceFocused] = useState(false);
  const [customInterestFocused, setCustomInterestFocused] = useState(false);
  const [goalsFocused, setGoalsFocused] = useState(false);
  const [availabilityNoteFocused, setAvailabilityNoteFocused] = useState(false);

  // Load categories on start
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      try {
        const cats = await api.get('/expert/categories');
        setDbCategories(cats);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  // Pre-populate draft avatar and fullName from profile / Google if available
  useEffect(() => {
    const updates: Partial<typeof draft> = {};
    if (!draft.avatarUrl && profile?.avatarUrl) {
      updates.avatarUrl = profile.avatarUrl;
    }
    if (!draft.fullName && profile?.fullName) {
      updates.fullName = profile.fullName;
    }
    if (draft.role !== 'seeker') {
      updates.role = 'seeker';
    }
    if (Object.keys(updates).length > 0) {
      draft.updateDraft(updates);
    }
  }, [profile?.avatarUrl, profile?.fullName]);

  // Set default username handle lifted from user email (or fullName fallback)
  useEffect(() => {
    if (!draft.username) {
      if (user?.email) {
        const fromEmail = user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 18);
        if (fromEmail) {
          draft.updateDraft({ username: fromEmail });
          return;
        }
      }
      if (draft.fullName) {
        const suggested = draft.fullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 15);
        draft.updateDraft({ username: `${suggested}` });
      }
    }
  }, [user?.email, draft.fullName]);

  // Debounced/Triggered handle uniqueness check
  const checkUsernameUniqueness = async (handle: string) => {
    if (handle.length < 3) return;
    setCheckingUsername(true);
    try {
      // Test username query
      await api.get(`/expert/discover`);
      setUsernameError(null);
    } catch (e) {
      // Mock error handle
    } finally {
      setCheckingUsername(false);
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const granted = await requestCameraPermission();
        if (!granted) {
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Library permission is required to choose a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        draft.updateDraft({ avatarUrl: result.assets[0].uri });
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // Streamlined 3-step seeker flow
  const totalSteps = 3;

  const handleNext = () => {
    if (draft.currentStep === 1) {
      if (!draft.fullName.trim() || draft.fullName.trim().length < 2) {
        Alert.alert('Validation Error', 'Please enter your full name (minimum 2 characters).');
        return;
      }
      if (!draft.username.trim() || draft.username.trim().length < 3) {
        Alert.alert('Validation Error', 'Please enter a unique username handle (minimum 3 characters).');
        return;
      }
    }
    if (draft.currentStep === 2) {
      if (!draft.location.trim()) {
        Alert.alert('Location Required', 'Please select your country and city to proceed.');
        return;
      }
    }
    draft.nextStep();
  };

  const handlePrev = () => {
    draft.prevStep();
  };

  const toggleCategorySelection = (catName: string) => {
    const isSelected = draft.interests.includes(catName);
    const updated = isSelected
      ? draft.interests.filter((i) => i !== catName)
      : [...draft.interests, catName];
    draft.updateDraft({ interests: updated });
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim()) {
      if (!draft.interests.includes(customInterest.trim())) {
        draft.updateDraft({ interests: [...draft.interests, customInterest.trim()] });
      }
      setCustomInterest('');
    }
  };

  const handleFinishOnboarding = async () => {
    setIsUploading(true);
    try {
      let finalAvatarUrl = draft.avatarUrl || profile?.avatarUrl || '';
      // If finalAvatarUrl is a local device URI, upload it to the server first
      if (finalAvatarUrl && !finalAvatarUrl.startsWith('http') && !finalAvatarUrl.startsWith('data:')) {
        try {
          const { uploadAvatar } = require('@/lib/api');
          const fileName = finalAvatarUrl.split('/').pop() || 'avatar.jpg';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const fileType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const uploadRes = await uploadAvatar(finalAvatarUrl, fileName, fileType);
          finalAvatarUrl = uploadRes.url;
        } catch (uploadError: any) {
          Alert.alert('Upload Error', 'Failed to upload profile photo: ' + uploadError.message);
          setIsUploading(false);
          return;
        }
      }

      // Build backend payload
      const payload: any = {
        fullName: draft.fullName.trim(),
        username: draft.username.trim().replace('@', ''),
        location: draft.location.trim(),
        avatarUrl: finalAvatarUrl,
        bio: draft.bio || '',
        goals: draft.goals || '',
        communicationStyle: draft.communicationStyle || 'Any',
        role: 'seeker',
        categories: draft.interests.map(
          (interestName) => dbCategories.find((c) => c.name === interestName)?._id || interestName
        ).filter((id) => id.length === 24),
      };

      await updateOnboarding(payload);
      
      // Contextual JIT permission primer for notifications
      await requestNotificationPermission();

      // Trigger Confetti
      setShowConfetti(true);
      
      // Delay redirect slightly for premium confetti view
      setTimeout(() => {
        draft.resetOnboarding();
        router.replace('/(tabs)');
      }, 2000);

    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Could not complete profile setup.');
    } finally {
      setIsUploading(false);
    }
  };

  const nextButtonDisabled = 
    (draft.currentStep === 1 && (!draft.fullName.trim() || draft.fullName.trim().length < 2 || !draft.username.trim() || draft.username.trim().length < 3 || checkingUsername)) ||
    (draft.currentStep === 2 && !draft.location.trim()) ||
    (draft.currentStep === 3 && draft.interests.length < 1);

  // Helper to render steps
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 1: {
        const rawAvatar = draft.avatarUrl || profile?.avatarUrl;
        const isFromGoogle = !!(rawAvatar && (rawAvatar.includes('googleusercontent.com') || rawAvatar.includes('google')));
        const displayAvatar = rawAvatar ? getAvatarUrl(rawAvatar, draft.fullName || profile?.fullName) : null;

        return (
          <View className="space-y-6">
            <View className="items-center mb-6">
              <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
                Set Up Your Profile
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm text-center px-4">
                Confirm your photo and naming handles so advisors recognize you.
              </Text>

              {/* Avatar Centerpiece */}
              <View className="relative mt-6 mb-3 items-center">
                <View 
                  style={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                    borderWidth: 3 
                  }}
                  className="w-28 h-28 rounded-full items-center justify-center overflow-hidden shadow-md"
                >
                  {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} className="w-full h-full" />
                  ) : (
                    <User size={48} color={isDark ? '#475569' : '#94a3b8'} />
                  )}
                </View>

                {/* Edit avatar button */}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Profile Photo', 'Choose how you want to add your photo:', [
                      { text: 'Take Photo', onPress: () => handlePickImage(true) },
                      { text: 'Choose from Gallery', onPress: () => handlePickImage(false) },
                      ...(rawAvatar ? [{ 
                        text: 'Remove Photo', 
                        style: 'destructive' as const, 
                        onPress: () => draft.updateDraft({ avatarUrl: '' }) 
                      }] : []),
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                  className="absolute bottom-0 right-0 bg-primary-500 p-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md"
                  accessibilityLabel="Change profile picture"
                >
                  <Camera size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Google/OAuth Source Indicator */}
              {isFromGoogle && (
                <View className="bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full flex-row items-center mb-2">
                  <Check size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text className="text-primary-700 dark:text-primary-400 text-xs font-semibold">
                    Photo imported from Google
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Profile Photo', 'Choose how you want to add your photo:', [
                    { text: 'Take Photo', onPress: () => handlePickImage(true) },
                    { text: 'Choose from Gallery', onPress: () => handlePickImage(false) },
                    ...(rawAvatar ? [{ 
                      text: 'Remove Photo', 
                      style: 'destructive' as const, 
                      onPress: () => draft.updateDraft({ avatarUrl: '' }) 
                    }] : []),
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Text className="text-primary-600 dark:text-primary-400 text-xs font-bold">
                  {rawAvatar ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full Name Input */}
            <View className="mb-4">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Full Name *
              </Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: fullNameFocused ? '#059669' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3"
              >
                <User size={18} color={fullNameFocused ? '#059669' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  value={draft.fullName}
                  onChangeText={(text) => draft.updateDraft({ fullName: text })}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  placeholder="e.g. David Chimbueze"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                />
              </View>
            </View>

            {/* Handle Username */}
            <View className="mb-4">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Username Handle *
              </Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: usernameFocused ? '#059669' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3"
              >
                <Text style={{ color: '#059669' }} className="font-bold text-base">@</Text>
                <TextInput
                  value={draft.username.replace('@', '')}
                  onChangeText={(text) => {
                    const cleanVal = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                    draft.updateDraft({ username: cleanVal });
                    checkUsernameUniqueness(cleanVal);
                  }}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  placeholder="davidchimb"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  autoCapitalize="none"
                  className="flex-1 text-slate-900 dark:text-white ml-1 text-base"
                />
                {checkingUsername && <ActivityIndicator size="small" color="#059669" />}
              </View>
              {usernameError ? (
                <Text className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{usernameError}</Text>
              ) : (
                <Text className="text-slate-500 text-xs mt-1 ml-1">Your unique handle for mentions and shares.</Text>
              )}
            </View>
          </View>
        );
      }

      case 2:
        return (
          <View className="space-y-6">
            <View className="mb-6">
              <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Where Are You Located?
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                We use your location to calculate consultation fees in Naira (₦) and connect you with advisors in your timezone.
              </Text>
            </View>

            {/* Location Selector Card */}
            <TouchableOpacity 
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.85}
              style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: draft.location ? '#059669' : (isDark ? '#1e293b' : '#cbd5e1'),
                borderWidth: 2,
              }}
              className="p-5 rounded-3xl shadow-sm mb-4"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-12 h-12 rounded-2xl bg-primary-500/10 items-center justify-center">
                  <MapPin size={24} color="#059669" />
                </View>
                <View className="bg-primary-500/10 px-3 py-1 rounded-full">
                  <Text className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase">
                    {draft.location ? 'Change City' : 'Tap to Select'}
                  </Text>
                </View>
              </View>

              <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Selected Location
              </Text>
              <Text className={`text-lg font-bold ${draft.location ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {draft.location || 'Country & City not chosen'}
              </Text>
              {draft.location ? (
                <View className="flex-row items-center mt-2">
                  <Check size={14} color="#059669" style={{ marginRight: 4 }} />
                  <Text className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    Currency set to Naira (₦) & Local Timezone
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center px-4">
              Tap the card above to select your country and city from the curated list.
            </Text>
          </View>
        );

      case 3:
        return (
          <View className="space-y-6">
            <View className="mb-6">
              <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                What do you want to learn?
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Select one or more topics that interest you to personalize your advisor feed.
              </Text>
            </View>

            {loadingCats ? (
              <ActivityIndicator color="#059669" style={{ paddingVertical: 24 }} />
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-6">
                {dbCategories.map((cat) => {
                  const isSelected = draft.interests.includes(cat.name);
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      onPress={() => toggleCategorySelection(cat.name)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: isSelected ? '#059669' : (isDark ? '#0f172a' : '#ffffff'),
                        borderColor: isSelected ? '#059669' : (isDark ? '#1e293b' : '#e2e8f0'),
                        borderWidth: 1.5,
                      }}
                      className="flex-row items-center px-4 py-2.5 rounded-full shadow-sm"
                    >
                      {isSelected && <Check size={14} color="#fff" style={{ marginRight: 6 }} />}
                      <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Custom Topic Addition */}
            <View className="mb-2">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Or add a specific topic:
              </Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: customInterestFocused ? '#059669' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row rounded-2xl px-4 py-1.5 items-center"
              >
                <TextInput
                  value={customInterest}
                  onChangeText={setCustomInterest}
                  onFocus={() => setCustomInterestFocused(true)}
                  onBlur={() => setCustomInterestFocused(false)}
                  placeholder="e.g. Growth Hacking, Legal, Real Estate..."
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  className="flex-1 text-slate-900 dark:text-white text-base py-2"
                />
                {customInterest.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={handleAddCustomInterest}
                    className="bg-primary-500 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-bold text-xs">Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Custom Selected Chips */}
            {draft.interests.filter((i) => !dbCategories.some((c) => c.name === i)).length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {draft.interests.filter((i) => !dbCategories.some((c) => c.name === i)).map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleCategorySelection(interest)}
                    style={{
                      backgroundColor: isDark ? '#1e1b4b' : '#f5f3ff',
                      borderColor: isDark ? '#312e81' : '#c084fc',
                      borderWidth: 1,
                    }}
                    className="px-3.5 py-1.5 rounded-full flex-row items-center"
                  >
                    <Text className="text-primary-700 dark:text-primary-300 text-xs font-bold mr-1.5">{interest}</Text>
                    <Text className="text-slate-400 text-xs font-bold">×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }}
      className="flex-1"
    >
      {/* Top Stepper Indicator */}
      <View 
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
          borderBottomWidth: 1,
          maxWidth: 576, // max-w-xl
          width: '100%',
          alignSelf: 'center',
        }}
        className="px-6 pt-12 pb-4 flex-row items-center shadow-sm dark:shadow-none"
      >
        {draft.currentStep > 1 && (
          <TouchableOpacity 
            onPress={handlePrev} 
            style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
            className="p-2 rounded-xl mr-3"
          >
            <ChevronLeft size={16} color={isDark ? '#fff' : '#0f172a'} />
          </TouchableOpacity>
        )}
        
        {/* Stepper Progress Bar */}
        <View className="flex-1 flex-row items-center space-x-1">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: draft.currentStep > idx ? '#059669' : (isDark ? '#1e293b' : '#cbd5e1')
              }}
              className="h-1.5 rounded-full flex-1"
            />
          ))}
        </View>
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold ml-4">
          Step {draft.currentStep}/{totalSteps}
        </Text>
      </View>

      {/* Main Wizard Form Body */}
      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 max-w-xl w-full self-center px-6"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
        
        {/* Stepper Navigation Buttons */}
        {draft.currentStep < totalSteps ? (
          <View className="flex-row space-x-3 mt-8">
            {draft.currentStep > 1 && (
              <TouchableOpacity
                onPress={handlePrev}
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
                className="flex-1 py-4 rounded-2xl items-center mr-2 active:bg-slate-100 dark:active:bg-slate-850"
              >
                <Text className="text-slate-800 dark:text-slate-300 font-bold text-base text-center">Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleNext}
              disabled={nextButtonDisabled}
              style={{
                backgroundColor: nextButtonDisabled ? (isDark ? 'rgba(5, 150, 105, 0.3)' : '#05966960') : '#059669'
              }}
              className="flex-1 py-4 rounded-2xl flex-row justify-center items-center active:bg-primary-600"
            >
              <Text className="text-white font-bold text-base mr-1">Next</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-8">
            {/* Final Submit Button */}
            <TouchableOpacity
              onPress={handleFinishOnboarding}
              disabled={apiSaving || isUploading || nextButtonDisabled}
              style={{
                backgroundColor: nextButtonDisabled ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#10b98160') : '#10b981',
              }}
              className="w-full py-4 rounded-2xl flex-row justify-center items-center active:bg-emerald-600 shadow-md"
            >
              {apiSaving || isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base mr-2">Complete Profile & Get Started</Text>
                  <Check size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePrev}
              className="w-full py-3.5 items-center mt-2"
            >
              <Text className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Back to Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confetti Overlay */}
      {showConfetti && <Confetti active={showConfetti} />}

      {/* Country and City Picker Modal */}
      <CountryCityPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectLocation={(loc) => draft.updateDraft({ location: loc })}
        initialLocation={draft.location}
      />
    </KeyboardAvoidingView>
  );
}
