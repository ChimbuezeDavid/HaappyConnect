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

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, updateOnboarding, isLoading: apiSaving } = useAuthStore();
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

  // Set default username suggestions when Full Name changes
  useEffect(() => {
    if (draft.fullName && !draft.username) {
      const suggested = draft.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 15);
      draft.updateDraft({ username: `${suggested}` });
    }
  }, [draft.fullName]);

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
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
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

  const skipAvatar = () => {
    // Generate a default dicebear avatar using their name or seed
    const seed = draft.fullName || user?.email || 'user';
    const defaultUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    draft.updateDraft({ avatarUrl: defaultUrl });
    draft.nextStep();
  };

  // Step limits and flows
  const isExpert = draft.role === 'expert';
  const totalSteps = isExpert ? 6 : 5;

  const handleNext = () => {
    if (draft.currentStep === 2) {
      // Username validation
      if (!draft.fullName.trim() || draft.fullName.length < 3) {
        Alert.alert('Validation Error', 'Please enter a valid full name (minimum 3 characters).');
        return;
      }
      if (!draft.username.trim() || draft.username.length < 3) {
        Alert.alert('Validation Error', 'Please enter a unique username handle.');
        return;
      }
    }
    draft.nextStep();
  };

  const handlePrev = () => {
    draft.prevStep();
  };

  const toggleCategorySelection = (catId: string) => {
    if (isExpert) {
      const selected = draft.categories.includes(catId)
        ? draft.categories.filter((c) => c !== catId)
        : [...draft.categories, catId];
      draft.updateDraft({ categories: selected });
    } else {
      const selected = draft.interests.includes(catId)
        ? draft.interests.filter((c) => c !== catId)
        : [...draft.interests, catId];
      draft.updateDraft({ interests: selected });
    }
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !draft.interests.includes(customInterest.trim())) {
      draft.updateDraft({ interests: [...draft.interests, customInterest.trim()] });
      setCustomInterest('');
    }
  };

  const handleFinishOnboarding = async () => {
    setIsUploading(true);
    try {
      let finalAvatarUrl = draft.avatarUrl;
      // If draft.avatarUrl is a local device URI, upload it to the server first
      if (draft.avatarUrl && !draft.avatarUrl.startsWith('http') && !draft.avatarUrl.startsWith('data:')) {
        try {
          const { uploadAvatar } = require('@/lib/api');
          const fileName = draft.avatarUrl.split('/').pop() || 'avatar.jpg';
          const uploadRes = await uploadAvatar(draft.avatarUrl, fileName);
          finalAvatarUrl = uploadRes.url;
        } catch (uploadError: any) {
          Alert.alert('Upload Error', 'Failed to upload profile photo: ' + uploadError.message);
          setIsUploading(false);
          return;
        }
      }

      // Build backend payload
      const payload: any = {
        fullName: draft.fullName,
        avatarUrl: finalAvatarUrl,
        bio: draft.bio,
        username: draft.username,
        location: draft.location,
        role: draft.role
      };

      if (isExpert) {
        payload.headline = draft.headline;
        payload.experience = draft.experience;
        payload.categories = draft.categories;
        payload.hourlyRate = Number(draft.callPrice) || 0;
        payload.textQuestionPrice = Number(draft.textPrice) || 0;
        payload.videoResponsePrice = Number(draft.videoPrice) || 0;
        payload.negotiableTiers = {
          hourlyRate: draft.callNegotiable,
          textQuestionPrice: draft.textNegotiable,
          videoResponsePrice: draft.videoNegotiable
        };
        payload.availabilityImmediate = draft.availabilityImmediate;
        payload.availabilityNote = draft.availabilityNote;
        payload.visibility = draft.visibility;
      } else {
        // Seekers
        payload.goals = draft.goals;
        payload.communicationStyle = draft.communicationStyle;
        payload.categories = draft.interests.map(
          (interestName) => dbCategories.find((c) => c.name === interestName)?._id || interestName
        ).filter(id => id.length === 24); // MongoDB ObjectIDs
      }

      await updateOnboarding(payload);
      
      // Trigger Confetti
      setShowConfetti(true);
      
      // Delay redirect slightly for premium confetti view
      setTimeout(() => {
        draft.resetOnboarding();
        router.replace('/(tabs)');
      }, 2500);

    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Could not complete profile setup.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to render steps
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 1:
        return (
          <View className="items-center py-6">
            <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Upload Profile Photo</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8 px-4">
              Add a professional picture so other users recognize you.
            </Text>

            {/* Circle Preview */}
            <View className="relative mb-10">
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 2 }}
                className="w-40 h-40 rounded-full items-center justify-center overflow-hidden"
              >
                {draft.avatarUrl ? (
                  <Image source={{ uri: draft.avatarUrl }} className="w-full h-full" />
                ) : (
                  <User size={64} color={isDark ? '#475569' : '#94a3b8'} />
                )}
              </View>
              {draft.avatarUrl ? (
                <TouchableOpacity
                  onPress={() => draft.updateDraft({ avatarUrl: '' })}
                  className="absolute bottom-0 right-0 bg-red-500 p-2.5 rounded-full border border-white dark:border-slate-950 active:bg-red-650"
                >
                  <Text className="text-white text-xs font-bold px-1">Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Photo Selection Triggers */}
            <View className="w-full space-y-4">
              <TouchableOpacity
                onPress={() => handlePickImage(true)}
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="w-full flex-row items-center justify-center py-4 px-6 rounded-2xl active:bg-slate-100 dark:active:bg-slate-850 mb-3 shadow-sm dark:shadow-none"
              >
                <Camera size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                <Text className="text-slate-900 dark:text-white font-bold text-base">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickImage(false)}
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="w-full flex-row items-center justify-center py-4 px-6 rounded-2xl active:bg-slate-100 dark:active:bg-slate-850 mb-3 shadow-sm dark:shadow-none"
              >
                <ImageIcon size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                <Text className="text-slate-900 dark:text-white font-bold text-base">Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={skipAvatar}
                className="w-full items-center py-3"
              >
                <Text className="text-primary-550 dark:text-primary-400 font-semibold text-sm">Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="space-y-6">
            <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Basic Profile Details</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Enter your naming handles and location info below.
            </Text>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name *</Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: fullNameFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3"
              >
                <User size={18} color={fullNameFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  value={draft.fullName}
                  onChangeText={(text) => draft.updateDraft({ fullName: text })}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  placeholder="Jane Doe"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                />
              </View>
            </View>

            {/* Handle Username */}
            <View className="mb-4">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username Handle *</Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: usernameFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#e2e8f0'),
                  borderWidth: 1.5,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3"
              >
                <Text style={{ color: usernameFocused ? '#8b5cf6' : '#8b5cf6' }} className="font-bold text-base">@</Text>
                <TextInput
                  value={draft.username.replace('@', '')}
                  onChangeText={(text) => {
                    const cleanVal = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                    draft.updateDraft({ username: cleanVal });
                    checkUsernameUniqueness(cleanVal);
                  }}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  placeholder="janedoe"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  autoCapitalize="none"
                  className="flex-1 text-slate-900 dark:text-white ml-1 text-base"
                />
                {checkingUsername && <ActivityIndicator size="small" color="#8b5cf6" />}
              </View>
              {usernameError ? (
                <Text className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{usernameError}</Text>
              ) : (
                <Text className="text-slate-500 dark:text-slate-500 text-xs mt-1 ml-1">Your unique handle for mentions & shares.</Text>
              )}
            </View>

            {/* Location */}
            <View className="mb-4">
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Location (City, Country) *</Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: locationFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3"
              >
                <MapPin size={18} color={locationFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} />
                <TextInput
                  value={draft.location}
                  onChangeText={(text) => draft.updateDraft({ location: text })}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => setLocationFocused(false)}
                  placeholder="Lagos, Nigeria"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                />
              </View>
            </View>

            {/* Bio */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">Bio / Description</Text>
                <Text className="text-slate-500 dark:text-slate-500 text-xs">{draft.bio.length}/250</Text>
              </View>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: bioFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                  height: 112,
                }}
                className="flex-row items-start rounded-2xl px-4 py-3"
              >
                <FileText size={18} color={bioFocused ? '#8b5cf6' : (isDark ? '#475569' : '#94a3b8')} style={{ marginTop: 4 }} />
                <TextInput
                  value={draft.bio}
                  onChangeText={(text) => {
                    if (text.length <= 250) {
                      draft.updateDraft({ bio: text });
                    }
                  }}
                  onFocus={() => setBioFocused(true)}
                  onBlur={() => setBioFocused(false)}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  multiline
                  numberOfLines={4}
                  className="flex-1 text-slate-900 dark:text-white ml-3 text-base h-full"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        if (isExpert) {
          // Expert Step 3: Professional Details
          return (
            <View className="space-y-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Professional Details</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Tell us about your background and select your primary categories.
              </Text>

              {/* Headline */}
              <View className="mb-4">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Professional Headline *</Text>
                <View 
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: headlineFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                    borderWidth: 1.5,
                  }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Sparkles size={18} color={headlineFocused ? '#8b5cf6' : (isDark ? '#94a3b8' : '#64748b')} />
                  <TextInput
                    value={draft.headline}
                    onChangeText={(text) => draft.updateDraft({ headline: text })}
                    onFocus={() => setHeadlineFocused(true)}
                    onBlur={() => setHeadlineFocused(false)}
                    placeholder="Senior Software Engineer | AI Consultant"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                  />
                </View>
              </View>

              {/* Experience Credentials */}
              <View className="mb-6">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Credentials / Experience *</Text>
                <View 
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: experienceFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                    borderWidth: 1.5,
                  }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Bookmark size={18} color={experienceFocused ? '#8b5cf6' : (isDark ? '#94a3b8' : '#64748b')} />
                  <TextInput
                    value={draft.experience}
                    onChangeText={(text) => draft.updateDraft({ experience: text })}
                    onFocus={() => setExperienceFocused(true)}
                    onBlur={() => setExperienceFocused(false)}
                    placeholder="10+ Years Experience / Certified Coach"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                  />
                </View>
              </View>

              {/* Category selections */}
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Expertise Categories (Select 3+)</Text>
              {loadingCats ? (
                <ActivityIndicator color="#8b5cf6" style={{ paddingVertical: 16 }} />
              ) : (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {dbCategories.map((cat) => {
                    const isSelected = draft.categories.includes(cat._id);
                    return (
                      <TouchableOpacity
                        key={cat._id}
                        onPress={() => toggleCategorySelection(cat._id)}
                        style={{
                          backgroundColor: isSelected ? '#8b5cf6' : (isDark ? '#0f172a' : '#ffffff'),
                          borderColor: isSelected ? '#8b5cf6' : (isDark ? '#1e293b' : '#e2e8f0'),
                          borderWidth: 1,
                        }}
                        className="flex-row items-center px-4 py-2.5 rounded-full"
                      >
                        {isSelected && <Check size={14} color="#fff" style={{ marginRight: 6 }} />}
                        <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        } else {
          // Seeker Step 3: Interests
          return (
            <View className="space-y-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Select Your Interests</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                What categories are you hoping to seek help in? Select at least 3.
              </Text>

              {loadingCats ? (
                <ActivityIndicator color="#8b5cf6" style={{ paddingVertical: 16 }} />
              ) : (
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {dbCategories.map((cat) => {
                    const isSelected = draft.interests.includes(cat.name);
                    return (
                      <TouchableOpacity
                        key={cat._id}
                        onPress={() => toggleCategorySelection(cat.name)}
                        style={{
                          backgroundColor: isSelected ? '#8b5cf6' : (isDark ? '#0f172a' : '#ffffff'),
                          borderColor: isSelected ? '#8b5cf6' : (isDark ? '#1e293b' : '#e2e8f0'),
                          borderWidth: 1,
                        }}
                        className="flex-row items-center px-4 py-2.5 rounded-full"
                      >
                        {isSelected && <Check size={14} color="#fff" style={{ marginRight: 6 }} />}
                        <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Add Custom Category Chip */}
              <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Can&apos;t find a category? Add custom:</Text>
              <View 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: customInterestFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                  borderWidth: 1.5,
                }}
                className="flex-row rounded-2xl px-4 py-1.5 items-center"
              >
                <TextInput
                  value={customInterest}
                  onChangeText={setCustomInterest}
                  onFocus={() => setCustomInterestFocused(true)}
                  onBlur={() => setCustomInterestFocused(false)}
                  placeholder="e.g. Artificial Intelligence"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  className="flex-1 text-slate-900 dark:text-white text-base py-2"
                />
                <TouchableOpacity
                  onPress={handleAddCustomInterest}
                  className="bg-primary-500 px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-bold text-xs">Add</Text>
                </TouchableOpacity>
              </View>

              {/* Custom selection summary */}
              {draft.interests.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {draft.interests.map((interest) => (
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
                      <Text className="text-primary-700 dark:text-primary-300 text-xs font-semibold mr-1.5">{interest}</Text>
                      <Text className="text-primary-800 dark:text-primary-400 text-xs font-bold">×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }
      case 4:
        if (isExpert) {
          // Expert Step 4: Pricing Setup
          return (
            <View className="space-y-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Set Your Rates (₦)</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Configure your pricing packages in Nigerian Naira. You can mark tiers as negotiable.
              </Text>

              {/* Tier 1: Quick Text Question */}
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none"
              >
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-primary-500/10 p-2 rounded-xl mr-3 border border-primary-500/20">
                      <FileText size={18} color="#8b5cf6" />
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-white font-bold text-base">Quick Text Question</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">Suggested: ₦1,000 - ₦10,000</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-slate-500 dark:text-slate-400 text-xs mr-2">Negotiable</Text>
                    <Switch
                      value={draft.textNegotiable}
                      onValueChange={(val) => draft.updateDraft({ textNegotiable: val })}
                      trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor={draft.textNegotiable ? '#fff' : (isDark ? '#475569' : '#94a3b8')}
                    />
                  </View>
                </View>
                <View 
                  style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Text className="text-slate-900 dark:text-white font-bold text-base mr-2">₦</Text>
                  <TextInput
                    value={draft.textPrice}
                    onChangeText={(val) => draft.updateDraft({ textPrice: val })}
                    keyboardType="numeric"
                    placeholder="2500"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white text-base font-bold"
                  />
                </View>
              </View>

              {/* Tier 2: Voice/Video Response */}
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none"
              >
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-primary-500/10 p-2 rounded-xl mr-3 border border-primary-500/20">
                      <Video size={18} color="#8b5cf6" />
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-white font-bold text-base">Voice/Video Response</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">Suggested: ₦5,000 - ₦30,000</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-slate-500 dark:text-slate-400 text-xs mr-2">Negotiable</Text>
                    <Switch
                      value={draft.videoNegotiable}
                      onValueChange={(val) => draft.updateDraft({ videoNegotiable: val })}
                      trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor={draft.videoNegotiable ? '#fff' : (isDark ? '#475569' : '#94a3b8')}
                    />
                  </View>
                </View>
                <View 
                  style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Text className="text-slate-900 dark:text-white font-bold text-base mr-2">₦</Text>
                  <TextInput
                    value={draft.videoPrice}
                    onChangeText={(val) => draft.updateDraft({ videoPrice: val })}
                    keyboardType="numeric"
                    placeholder="7500"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white text-base font-bold"
                  />
                </View>
              </View>

              {/* Tier 3: Live Video Call */}
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="rounded-3xl p-5 mb-4 shadow-sm dark:shadow-none"
              >
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-primary-500/10 p-2 rounded-xl mr-3 border border-primary-500/20">
                      <Phone size={18} color="#8b5cf6" style={{ transform: [{ rotate: '90deg' }] }} />
                    </View>
                    <View>
                      <Text className="text-slate-900 dark:text-white font-bold text-base">Live Video Call (30 mins)</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">Suggested: ₦10,000 - ₦100,000</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-slate-500 dark:text-slate-400 text-xs mr-2">Negotiable</Text>
                    <Switch
                      value={draft.callNegotiable}
                      onValueChange={(val) => draft.updateDraft({ callNegotiable: val })}
                      trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor={draft.callNegotiable ? '#fff' : (isDark ? '#475569' : '#94a3b8')}
                    />
                  </View>
                </View>
                <View 
                  style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Text className="text-slate-900 dark:text-white font-bold text-base mr-2">₦</Text>
                  <TextInput
                    value={draft.callPrice}
                    onChangeText={(val) => draft.updateDraft({ callPrice: val })}
                    keyboardType="numeric"
                    placeholder="25000"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white text-base font-bold"
                  />
                </View>
              </View>
            </View>
          );
        } else {
          // Seeker Step 4: Goals / Introduction
          return (
            <View className="space-y-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Goals & Preferences</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Tell us what you hope to achieve and how you prefer to communicate.
              </Text>

              {/* Goals Description */}
              <View className="mb-6">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">What are you hoping to achieve? *</Text>
                <View 
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: goalsFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                    borderWidth: 1.5,
                    height: 128,
                  }}
                  className="flex-row items-start rounded-2xl px-4 py-3"
                >
                  <FileText size={18} color={goalsFocused ? '#8b5cf6' : (isDark ? '#94a3b8' : '#64748b')} style={{ marginTop: 4 }} />
                  <TextInput
                    value={draft.goals}
                    onChangeText={(text) => draft.updateDraft({ goals: text })}
                    onFocus={() => setGoalsFocused(true)}
                    onBlur={() => setGoalsFocused(false)}
                    placeholder="Describe your goals (e.g. Learn how to launch a startup, debug architecture issues, transition careers...)"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    multiline
                    numberOfLines={5}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base h-full"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Preferred Communication Style */}
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Preferred Communication Style</Text>
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
                className="flex-row p-1.5 rounded-2xl"
              >
                {(['Text', 'Voice', 'Video', 'Any'] as const).map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => draft.updateDraft({ communicationStyle: style })}
                    style={{
                      backgroundColor: draft.communicationStyle === style ? '#8b5cf6' : 'transparent',
                    }}
                    className="flex-1 items-center justify-center py-3 rounded-xl"
                  >
                    <Text
                      className={`font-semibold text-xs ${
                        draft.communicationStyle === style ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }

      case 5:
        if (isExpert) {
          // Expert Step 5: Availability Setup
          return (
            <View className="space-y-6">
              <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Availability & Visibility</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Configure your active visibility settings for Seekers.
              </Text>

              {/* Immediate Availability Toggle */}
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="rounded-3xl p-5 flex-row justify-between items-center mb-4 shadow-sm dark:shadow-none"
              >
                <View className="flex-1 mr-4">
                  <Text className="text-slate-900 dark:text-white font-bold text-base mb-1">Available Immediately</Text>
                  <Text className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed">
                    Toggle on to let seekers know you are online and responsive for quick Q&A.
                  </Text>
                </View>
                <Switch
                  value={draft.availabilityImmediate}
                  onValueChange={(val) => draft.updateDraft({ availabilityImmediate: val })}
                  trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor={draft.availabilityImmediate ? '#fff' : (isDark ? '#475569' : '#94a3b8')}
                />
              </View>

              {/* Availability Note */}
              <View className="mb-4">
                <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Availability Notes</Text>
                <View 
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: availabilityNoteFocused ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1'),
                    borderWidth: 1.5,
                  }}
                  className="flex-row items-center rounded-2xl px-4 py-3"
                >
                  <Bookmark size={18} color={availabilityNoteFocused ? '#8b5cf6' : (isDark ? '#94a3b8' : '#64748b')} />
                  <TextInput
                    value={draft.availabilityNote}
                    onChangeText={(text) => draft.updateDraft({ availabilityNote: text })}
                    onFocus={() => setAvailabilityNoteFocused(true)}
                    onBlur={() => setAvailabilityNoteFocused(false)}
                    placeholder="e.g. Weekdays 6PM-9PM, Saturday mornings"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                  />
                </View>
              </View>

              {/* Profile Visibility */}
              <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Profile Visibility</Text>
              <View 
                style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                className="flex-row p-1.5 rounded-2xl"
              >
                {(['Public', 'Private'] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => draft.updateDraft({ visibility: opt })}
                    style={{
                      backgroundColor: draft.visibility === opt ? '#8b5cf6' : 'transparent',
                    }}
                    className="flex-1 items-center justify-center py-3 rounded-xl"
                  >
                    <Text
                      className={`font-semibold text-xs ${
                        draft.visibility === opt ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {opt === 'Public' ? 'Visible to everyone' : 'Only direct link'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        } else {
          // Seeker Step 5: Review & Complete
          return renderReviewStep();
        }

      case 6:
        if (isExpert) {
          // Expert Step 6: Review & Complete
          return renderReviewStep();
        }
        return null;

      default:
        return null;
    }
  };

  const renderReviewStep = () => {
    return (
      <View className="space-y-6">
        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-1">Review & Complete</Text>
        <Text className="text-slate-550 dark:text-slate-400 text-sm mb-6">
          Double check your details before finalizing your profile.
        </Text>

        {/* Review Card */}
        <View 
          style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
          className="rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl"
        >
          {/* Header Summary */}
          <View className="flex-row items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <Image
              source={{ uri: draft.avatarUrl || 'https://via.placeholder.com/150' }}
              style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1 }}
              className="w-16 h-16 rounded-full"
            />
            <View className="ml-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">{draft.fullName || 'Unspecified Name'}</Text>
              <Text className="text-violet-600 dark:text-violet-400 text-sm font-semibold">@{draft.username || 'username'}</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{draft.location || 'No Location'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => draft.updateDraft({ currentStep: 2 })}
              style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
              className="ml-auto px-3 py-1.5 rounded-full"
            >
              <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Account Role details */}
          <View className="flex-row justify-between items-center py-1">
            <Text className="text-slate-500 dark:text-slate-400 text-sm">Account Type</Text>
            <View 
              style={{ 
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)', 
                borderColor: 'rgba(139, 92, 246, 0.3)', 
                borderWidth: 1,
                borderRadius: 9999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text className="text-violet-600 dark:text-violet-400 font-bold uppercase text-xs">
                {draft.role}
              </Text>
            </View>
          </View>

          {/* Bio details */}
          <View className="py-1">
            <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Bio</Text>
            <Text className="text-slate-800 dark:text-slate-350 text-sm leading-relaxed">{draft.bio || 'No bio provided.'}</Text>
          </View>

          {/* Role specific summary */}
          {isExpert ? (
            <>
              {/* Expert Offerings */}
              <View className="border-t border-slate-200 dark:border-slate-800/60 pt-4 space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Expert details</Text>
                  <TouchableOpacity 
                    onPress={() => draft.updateDraft({ currentStep: 3 })}
                    style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                    className="px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">Edit</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <Text className="text-slate-550 dark:text-slate-400 text-xs uppercase tracking-wider">Headline</Text>
                  <Text className="text-slate-800 dark:text-white text-sm mt-0.5">{draft.headline || 'No professional headline.'}</Text>
                </View>
                <View>
                  <Text className="text-slate-555 dark:text-slate-400 text-xs uppercase tracking-wider">Experience</Text>
                  <Text className="text-slate-800 dark:text-white text-sm mt-0.5">{draft.experience || 'No experience configured.'}</Text>
                </View>
                <View>
                  <Text className="text-slate-555 dark:text-slate-400 text-xs uppercase tracking-wider">Categories ({draft.categories.length})</Text>
                  <Text className="text-slate-800 dark:text-white text-sm mt-0.5">
                    {draft.categories
                      .map((id) => dbCategories.find((c) => c._id === id)?.name || '')
                      .filter(Boolean)
                      .join(', ') || 'No categories selected.'}
                  </Text>
                </View>
              </View>

              {/* Expert Pricing details */}
              <View className="border-t border-slate-200 dark:border-slate-800/60 pt-4 space-y-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Rates & Packages</Text>
                  <TouchableOpacity 
                    onPress={() => draft.updateDraft({ currentStep: 4 })}
                    style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                    className="px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-slate-655 dark:text-slate-400 text-xs font-bold">Edit</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">Text Question</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-sm">₦{draft.textPrice} {draft.textNegotiable ? '(Negotiable)' : ''}</Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">Voice/Video Response</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-sm">₦{draft.videoPrice} {draft.videoNegotiable ? '(Negotiable)' : ''}</Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">Live Call (30 min)</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-sm">₦{draft.callPrice} {draft.callNegotiable ? '(Negotiable)' : ''}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Seeker Interests */}
              <View className="border-t border-slate-200 dark:border-slate-800/60 pt-4 space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Interests ({draft.interests.length})</Text>
                  <TouchableOpacity 
                    onPress={() => draft.updateDraft({ currentStep: 3 })}
                    style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                    className="px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-slate-800 dark:text-white text-sm">{draft.interests.join(', ') || 'None selected.'}</Text>
              </View>

              {/* Seeker Goals */}
              <View className="border-t border-slate-200 dark:border-slate-800/60 pt-4 space-y-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Goals & Preferences</Text>
                  <TouchableOpacity 
                    onPress={() => draft.updateDraft({ currentStep: 4 })}
                    style={{ backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderWidth: 1 }}
                    className="px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">Edit</Text>
                  </TouchableOpacity>
                </View>
                <View className="mt-1">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Hoping to achieve</Text>
                  <Text className="text-slate-800 dark:text-white text-sm mt-0.5 leading-relaxed">{draft.goals || 'No goals specified.'}</Text>
                </View>
                <View className="flex-row justify-between pt-2">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">Preferred Comm Style</Text>
                  <Text className="text-slate-800 dark:text-white font-bold text-sm">{draft.communicationStyle}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const nextButtonDisabled = 
    (draft.currentStep === 2 && (!draft.fullName.trim() || !draft.username.trim() || checkingUsername)) ||
    (draft.currentStep === 3 && isExpert && draft.categories.length < 3) ||
    (draft.currentStep === 3 && !isExpert && draft.interests.length < 3) ||
    (draft.currentStep === 4 && !isExpert && !draft.goals.trim());

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
                backgroundColor: draft.currentStep > idx ? '#8b5cf6' : (isDark ? '#1e293b' : '#cbd5e1')
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
                backgroundColor: nextButtonDisabled ? (isDark ? 'rgba(139, 92, 246, 0.3)' : '#8b5cf660') : '#8b5cf6'
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
              disabled={apiSaving || isUploading}
              style={{ backgroundColor: '#10b981' }}
              className="w-full py-4 rounded-2xl flex-row justify-center items-center active:bg-emerald-600"
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
          </View>
        )}
      </ScrollView>

      {/* Confetti Overlay */}
      {showConfetti && <Confetti active={showConfetti} />}
    </KeyboardAvoidingView>
  );
}
