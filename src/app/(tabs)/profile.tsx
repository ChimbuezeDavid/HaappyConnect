import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { LogOut, User, Sparkles, Mail, ShieldAlert, CalendarDays, Award, Camera, Image as ImageIcon, Check, X, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SignInWall from '@/components/ui/SignInWall';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';

export default function ProfileScreen() {
  const { user, profile, logout, updateOnboarding, isGuest } = useAuthStore();
  const router = useRouter();

  // Edit Seeker Profile State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [goals, setGoals] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState<'Text' | 'Voice' | 'Video' | 'Any'>('Any');
  const [isSaving, setIsSaving] = useState(false);

  // Theme support
  const { colorScheme } = useColorScheme();
  const { theme, setTheme } = useThemeStore();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setAvatarUrl(profile.avatarUrl || '');
      setGoals(profile.goals || '');
      setCommunicationStyle(profile.communicationStyle || 'Any');
    }
  }, [profile]);

  if (isGuest) {
    return <SignInWall />;
  }

  const handleLogout = async () => {
    await logout();
    // Redirect is handled reactively by _layout.tsx
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
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Display name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await updateOnboarding({
        fullName,
        avatarUrl,
        goals,
        communicationStyle,
      });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Server error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const isExpert = user?.role === 'expert';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <ScrollView className="flex-1 px-4 py-4 max-w-lg w-full self-center" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 1. Profile Header Card */}
        <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 items-center mb-5 shadow-sm dark:shadow-none">
          <View className="relative mb-3">
            <Image
              source={{ uri: profile?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || 'user'}` }}
              className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-primary-500/30 dark:border-primary-400/30"
            />
            {!isExpert && (
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(true)}
                className="absolute bottom-0 right-0 bg-primary-500 p-2 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
              >
                <Camera size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{profile?.fullName || 'User Profile'}</Text>
          
          <View className="flex-row items-center gap-2 mt-1.5">
            <View className="bg-violet-500/10 dark:bg-violet-500/20 px-3 py-1 rounded-full border border-violet-500/20">
              <Text className="text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
                {user?.role} Account
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mt-3 text-slate-400">
            <Mail size={13} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">{user?.email}</Text>
          </View>
        </View>

        {/* 2. Management & Quick Actions Group */}
        <View className="mb-5">
          <Text className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2.5 ml-1">
            Account Management
          </Text>
          
          {isExpert ? (
            <View className="space-y-3">
              <TouchableOpacity
                onPress={() => router.push('/expert/edit-profile')}
                activeOpacity={0.75}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between shadow-sm dark:shadow-none mb-2.5"
              >
                <View className="flex-row items-center">
                  <View className="bg-primary-500/10 p-2.5 rounded-xl mr-3">
                    <Sparkles size={18} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text className="text-slate-900 dark:text-white font-bold text-sm">Edit Professional Listing</Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Headline, bio, categories & rates</Text>
                  </View>
                </View>
                <Text className="text-slate-400 dark:text-slate-600 text-base font-bold">›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/expert/availability')}
                activeOpacity={0.75}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between shadow-sm dark:shadow-none"
              >
                <View className="flex-row items-center">
                  <View className="bg-emerald-500/10 p-2.5 rounded-xl mr-3">
                    <CalendarDays size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-slate-900 dark:text-white font-bold text-sm">Live Call Availability</Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Set weekly slots & time zones</Text>
                  </View>
                </View>
                <Text className="text-slate-400 dark:text-slate-600 text-base font-bold">›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.75}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between shadow-sm dark:shadow-none"
            >
              <View className="flex-row items-center">
                <View className="bg-primary-500/10 p-2.5 rounded-xl mr-3">
                  <Sparkles size={18} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Edit Seeker Profile</Text>
                  <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Name, goals & communication style</Text>
                </View>
              </View>
              <Text className="text-slate-400 dark:text-slate-600 text-base font-bold">›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Profile Overview Summary */}
        {isExpert && profile && (
          <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-5 shadow-sm dark:shadow-none">
            <Text className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider mb-3">
              Listing Overview
            </Text>
            
            <Text className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider mb-1">Headline</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-sm mb-3.5 leading-relaxed">{profile.headline || 'No headline set'}</Text>

            <Text className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider mb-1">Bio</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-sm mb-4 leading-relaxed">{profile.bio || 'No biography set'}</Text>

            <View className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2.5">Active Pricing</Text>
              <View className="flex-row gap-2">
                <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Text className="text-slate-400 text-[10px] uppercase font-bold">1:1 Call</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-0.5">₦{profile.hourlyRate}/hr</Text>
                </View>
                <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Text className="text-slate-400 text-[10px] uppercase font-bold">Written</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-0.5">₦{profile.textQuestionPrice}</Text>
                </View>
                <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Text className="text-slate-400 text-[10px] uppercase font-bold">Video</Text>
                  <Text className="text-slate-900 dark:text-white font-extrabold text-xs mt-0.5">₦{profile.videoResponsePrice}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {!isExpert && profile && (
          <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-5 shadow-sm dark:shadow-none">
            <Text className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider mb-3">
              Seeker Preferences
            </Text>
            
            <Text className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider mb-1">Learning Goals</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-sm mb-3.5 leading-relaxed">{profile.goals || 'No specific goals set yet.'}</Text>

            <Text className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider mb-1">Preferred Style</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-sm">{profile.communicationStyle || 'Any'}</Text>
          </View>
        )}

        {/* 4. Appearance & Preferences Group */}
        <View className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 mb-5 shadow-sm dark:shadow-none">
          <Text className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-wider mb-3">
            Appearance & Theme
          </Text>
          <View className="flex-row bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-850">
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isActive = theme === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setTheme(mode)}
                  className={`flex-1 items-center justify-center py-2.5 rounded-xl ${
                    isActive ? 'bg-primary-500' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs capitalize ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Account Actions */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.75}
          className="w-full bg-red-500/10 border border-red-500/20 py-4 rounded-2xl items-center flex-row justify-center mb-6"
          style={{ minHeight: 52 }}
        >
          <LogOut size={16} color="#ef4444" />
          <Text className="text-red-500 dark:text-red-400 font-extrabold text-sm ml-2">Log Out of Haappy-Connect</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Seeker Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
        transparent={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-slate-50 dark:bg-slate-950"
        >
          <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 60 }}>
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl dark:shadow-none">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2 rounded-full"
                >
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Profile Picture */}
              <View className="items-center mb-6 mt-2">
                <View className="relative mb-4">
                  <View className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 items-center justify-center overflow-hidden">
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
                    className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-2.5 rounded-xl flex-row items-center mr-2"
                  >
                    <Camera size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                    <Text className="text-slate-800 dark:text-white text-xs font-bold">Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePickImage(false)}
                    className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-2.5 rounded-xl flex-row items-center"
                  >
                    <ImageIcon size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                    <Text className="text-slate-800 dark:text-white text-xs font-bold">From Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Display Name */}
              <View className="mb-4">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Display Name *</Text>
                <View className="flex-row items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
                  <User size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Jane Doe"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base"
                  />
                </View>
              </View>

              {/* Goals Description */}
              <View className="mb-4">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Learning Goals</Text>
                <View className="flex-row items-start bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 h-28">
                  <FileText size={18} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginTop: 4 }} />
                  <TextInput
                    value={goals}
                    onChangeText={setGoals}
                    placeholder="What are you hoping to achieve?"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    multiline
                    numberOfLines={4}
                    className="flex-1 text-slate-900 dark:text-white ml-3 text-base h-full"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Preferred Communication Style */}
              <View className="mb-6">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Preferred Communication Style</Text>
                <View className="flex-row bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-1.5 rounded-2xl">
                  {(['Text', 'Voice', 'Video', 'Any'] as const).map((style) => (
                    <TouchableOpacity
                      key={style}
                      onPress={() => setCommunicationStyle(style)}
                      className={`flex-1 items-center justify-center py-3 rounded-xl ${
                        communicationStyle === style ? 'bg-primary-500' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`font-semibold text-xs ${
                          communicationStyle === style ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {style}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-primary-500 rounded-2xl flex-row justify-center items-center shadow-lg shadow-primary-500"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
