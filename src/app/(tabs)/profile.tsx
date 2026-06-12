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
    <View className="flex-1 bg-slate-50 dark:bg-slate-950" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <ScrollView className="flex-1 px-4 py-4 max-w-md w-full self-center" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Card */}
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 items-center mb-6 shadow-sm dark:shadow-none">
          <Image
            source={{ uri: profile?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || 'user'}` }}
            className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-850 mb-4"
          />
          <Text className="text-xl font-bold text-slate-900 dark:text-white">{profile?.fullName || 'User Profile'}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-semibold uppercase bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-1 rounded-full">
            {user?.role} Account
          </Text>

          <View className="flex-row items-center mt-4 text-slate-500">
            <Mail size={14} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-slate-500 dark:text-slate-400 text-sm ml-2">{user?.email}</Text>
          </View>
        </View>

        {/* Expert Profile View Details */}
        {isExpert && profile && (
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm dark:shadow-none">
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Public Listing Details</Text>
            
            <Text className="text-slate-900 dark:text-white font-bold text-sm">Headline</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4 leading-relaxed">{profile.headline}</Text>

            <Text className="text-slate-900 dark:text-white font-bold text-sm">Biography</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4 leading-relaxed">{profile.bio}</Text>

            <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Service Pricing</Text>
             <View className="flex-row justify-between bg-slate-100 dark:bg-slate-950 px-4 py-3 rounded-2xl mb-3 border border-slate-200/50 dark:border-slate-850">
              <Text className="text-slate-600 dark:text-slate-400 text-sm">1:1 Live Call Rate</Text>
              <Text className="text-slate-900 dark:text-white font-bold text-sm">₦{profile.hourlyRate}/hour</Text>
            </View>
            <View className="flex-row justify-between bg-slate-100 dark:bg-slate-950 px-4 py-3 rounded-2xl mb-3 border border-slate-200/50 dark:border-slate-850">
              <Text className="text-slate-600 dark:text-slate-400 text-sm">Written Question Price</Text>
              <Text className="text-slate-900 dark:text-white font-bold text-sm">₦{profile.textQuestionPrice}</Text>
            </View>
            <View className="flex-row justify-between bg-slate-100 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-850">
              <Text className="text-slate-600 dark:text-slate-400 text-sm">Video response Price</Text>
              <Text className="text-slate-900 dark:text-white font-bold text-sm">₦{profile.videoResponsePrice}</Text>
            </View>
          </View>
        )}

        {/* Seeker Profile View Details */}
        {!isExpert && profile && (
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm dark:shadow-none">
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Seeker Profile Details</Text>
            
            <Text className="text-slate-900 dark:text-white font-bold text-sm">Learning Goals</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4 leading-relaxed">{profile.goals || 'No goals specified yet.'}</Text>

            <Text className="text-slate-900 dark:text-white font-bold text-sm">Preferred Communication</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-4 leading-relaxed">{profile.communicationStyle || 'Any'}</Text>
          </View>
        )}

        {/* Appearance Settings */}
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm dark:shadow-none">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Appearance Theme</Text>
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

        {/* Edit Profile Navigation */}
        {isExpert && (
          <>
            <TouchableOpacity
              onPress={() => router.push('/expert/edit-profile')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit professional details"
              accessibilityHint="Navigate to edit your expert profile"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl items-center mb-4 flex-row justify-center shadow-sm dark:shadow-none"
              style={{ minHeight: 52 }}
            >
              <Sparkles size={16} color={isDark ? '#fff' : '#8b5cf6'} />
              <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-2">Edit Professional Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/expert/availability')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Manage availability"
              accessibilityHint="Navigate to configure your call times and weekly slots"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl items-center mb-4 flex-row justify-center shadow-sm dark:shadow-none"
              style={{ minHeight: 52 }}
            >
              <CalendarDays size={16} color={isDark ? '#fff' : '#8b5cf6'} />
              <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-2">Manage Live Call Availability</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Seeker Edit Profile Button */}
        {!isExpert && (
          <TouchableOpacity
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit profile details"
            accessibilityHint="Open modal to edit seeker details and profile picture"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl items-center mb-4 flex-row justify-center shadow-sm dark:shadow-none"
            style={{ minHeight: 52 }}
          >
            <Sparkles size={16} color={isDark ? '#fff' : '#8b5cf6'} />
            <Text className="text-slate-900 dark:text-white font-semibold text-sm ml-2">Edit Profile Details</Text>
          </TouchableOpacity>
        )}

        {/* Logout Action */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          accessibilityHint="Sign out of your account"
          className="w-full bg-red-500/10 border border-red-500/20 py-4 rounded-2xl items-center flex-row justify-center mb-8"
          style={{ minHeight: 52 }}
        >
          <LogOut size={16} color="#ef4444" />
          <Text className="text-red-500 dark:text-red-400 font-bold text-sm ml-2">Log Out</Text>
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
