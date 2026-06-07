import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Category } from '@/types';
import { Sparkles, User, FileText, Check, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';

export default function EditProfileModal() {
  const { profile, updateOnboarding, isLoading } = useAuthStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [hourlyRate, setHourlyRate] = useState(profile?.hourlyRate?.toString() || '');
  const [textQuestionPrice, setTextQuestionPrice] = useState(profile?.textQuestionPrice?.toString() || '');
  const [videoResponsePrice, setVideoResponsePrice] = useState(profile?.videoResponsePrice?.toString() || '');
  
  // Category states
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.categories?.map((c) => c._id || (c as any)) || []
  );
  const [loadingCategories, setLoadingCategories] = useState(false);

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
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const cats = await api.get('/expert/categories');
        setDbCategories(cats);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== id));
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const handleSave = async () => {
    if (!fullName || !headline || !bio) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await updateOnboarding({
        fullName,
        avatarUrl,
        headline,
        bio,
        hourlyRate: Number(hourlyRate) || 0,
        textQuestionPrice: Number(textQuestionPrice) || 0,
        videoResponsePrice: Number(videoResponsePrice) || 0,
        categories: selectedCategories,
      });
      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Server error saving profile');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50 dark:bg-slate-955"
    >
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl">
          <Text className="text-xl font-bold text-slate-900 dark:text-white mb-6">Edit Profile Details</Text>

          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Display Name *</Text>
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              <User size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
              />
            </View>
          </View>

          {/* Profile Picture */}
          <View className="items-center mb-6 mt-2">
            <View className="relative mb-4">
              <View className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                ) : (
                  <User size={40} color={isDark ? '#475569' : '#94a3b8'} />
                )}
              </View>
            </View>

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => handlePickImage(true)}
                className="bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-4 py-2.5 rounded-xl flex-row items-center mr-2"
              >
                <Camera size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                <Text className="text-slate-800 dark:text-white text-xs font-bold">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickImage(false)}
                className="bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <ImageIcon size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                <Text className="text-slate-800 dark:text-white text-xs font-bold">From Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Headline */}
          <View className="mb-4">
            <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Professional Headline *</Text>
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              <Sparkles size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              <TextInput
                value={headline}
                onChangeText={setHeadline}
                placeholder="Headline"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
              />
            </View>
          </View>

          {/* Bio */}
          <View className="mb-4">
            <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Biography / Bio *</Text>
            <View className="flex-row items-start bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 h-28">
              <FileText size={18} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginTop: 4 }} />
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Biography"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                multiline
                numberOfLines={4}
                className="flex-1 text-slate-900 dark:text-white ml-3 text-base h-full"
                style={{ textAlignVertical: 'top' }}
              />
            </View>
          </View>

          {/* Pricing Grid */}
          <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Pricing Packages (₦ Naira)</Text>
          <View className="flex-row space-x-3 mb-6">
            {/* Hourly Rate */}
            <View className="flex-1 mr-2">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] mb-1">Hourly Live Call</Text>
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5">
                <Text className="text-[#94a3b8] font-bold text-base mr-1">₦</Text>
                <TextInput
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  placeholder="Hourly Rate"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  keyboardType="numeric"
                  className="flex-1 text-slate-900 dark:text-white ml-1 text-sm font-bold"
                />
              </View>
            </View>

            {/* Text Question */}
            <View className="flex-1 mr-2">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] mb-1">Text Question</Text>
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5">
                <Text className="text-[#94a3b8] font-bold text-base mr-1">₦</Text>
                <TextInput
                  value={textQuestionPrice}
                  onChangeText={setTextQuestionPrice}
                  placeholder="Text Price"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  keyboardType="numeric"
                  className="flex-1 text-slate-900 dark:text-white ml-1 text-sm font-bold"
                />
              </View>
            </View>

            {/* Video Response */}
            <View className="flex-1">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] mb-1">Video Answer</Text>
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5">
                <Text className="text-[#94a3b8] font-bold text-base mr-1">₦</Text>
                <TextInput
                  value={videoResponsePrice}
                  onChangeText={setVideoResponsePrice}
                  placeholder="Video Price"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  keyboardType="numeric"
                  className="flex-1 text-slate-900 dark:text-white ml-1 text-sm font-bold"
                />
              </View>
            </View>
          </View>

          {/* Categories Selector */}
          <Text className="text-slate-655 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Select Categories</Text>
          {loadingCategories ? (
            <ActivityIndicator color="#8b5cf6" style={{ paddingVertical: 16 }} />
          ) : (
            <View className="flex-row flex-wrap gap-2 mb-6">
              {dbCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat._id);
                return (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => toggleCategory(cat._id)}
                    className={`flex-row items-center px-3.5 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-slate-100 dark:bg-slate-955 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isSelected && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                    <Text className={`text-xs ${isSelected ? 'text-white font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className="w-full py-4 bg-primary-500 rounded-2xl flex-row justify-center items-center shadow-lg shadow-primary-500"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
