import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import {
  LogOut,
  User,
  Sparkles,
  Mail,
  CalendarDays,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  FileText,
  Wallet,
  ShieldCheck,
  Clock,
  Banknote,
  ChevronRight,
  Headphones,
  MessageSquare,
  PhoneCall,
  Lock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SignInWall from '@/components/ui/SignInWall';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';
import AppScreen from '@/components/ui/AppScreen';
import PasswordChangeModal from '@/components/profile/PasswordChangeModal';

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

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

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

  const isExpert = user?.role === 'expert';

  const handleLogout = async () => {
    await logout();
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

  const renderIdentityCard = () => (
    <View
      style={{
        backgroundColor: isDark ? '#131A22' : '#FFFFFF',
        borderColor: isDark ? '#222D3D' : '#E7E1D8',
        borderWidth: 1,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <View style={{ position: 'relative', marginBottom: 12 }}>
        <Image
          source={{
            uri:
              profile?.avatarUrl ||
              `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.fullName || 'user'}`,
          }}
          style={{
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: isDark ? '#1B2430' : '#F3EFEA',
            borderWidth: 3,
            borderColor: isDark ? '#10B98130' : '#05966930',
          }}
        />
        {!isExpert && (
          <TouchableOpacity
            onPress={() => setIsEditModalVisible(true)}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: '#059669',
              padding: 8,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: isDark ? '#131A22' : '#FFFFFF',
            }}
            accessibilityLabel="Change avatar"
          >
            <Camera size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: 'PlusJakartaSans_700Bold',
            color: isDark ? '#F8FAFC' : '#0F172A',
          }}
        >
          {profile?.fullName || 'My Account'}
        </Text>
        {isExpert && (
          <View
            style={{
              backgroundColor: isDark ? '#10B98120' : '#05966915',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <ShieldCheck size={14} color={isDark ? '#34D399' : '#059669'} />
          </View>
        )}
      </View>

      {isExpert && profile?.headline ? (
        <Text
          style={{
            fontSize: 13,
            color: isDark ? '#94A3B8' : '#64748B',
            textAlign: 'center',
            marginTop: 4,
            fontFamily: 'Inter_400Regular',
          }}
        >
          {profile.headline}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Mail size={12} color={isDark ? '#64748B' : '#94A3B8'} />
        <Text
          style={{
            fontSize: 12,
            color: isDark ? '#64748B' : '#94A3B8',
            marginLeft: 6,
            fontFamily: 'Inter_400Regular',
          }}
        >
          {user?.email}
        </Text>
      </View>
    </View>
  );

  const renderSecurityCard = () => (
    <View
      style={{
        backgroundColor: isDark ? '#131A22' : '#FFFFFF',
        borderColor: isDark ? '#222D3D' : '#E7E1D8',
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: 'PlusJakartaSans_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: isDark ? '#64748B' : '#94A3B8',
          marginBottom: 12,
        }}
      >
        Security & Credentials
      </Text>

      <TouchableOpacity
        onPress={() => setIsPasswordModalVisible(true)}
        activeOpacity={0.7}
        style={{
          backgroundColor: isDark ? '#0B0F14' : '#F8FAFC',
          borderColor: isDark ? '#222D3D' : '#E2E8F0',
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              backgroundColor: isDark ? '#10B98120' : '#05966915',
              padding: 9,
              borderRadius: 12,
              marginRight: 12,
            }}
          >
            <Lock size={16} color={isDark ? '#34D399' : '#059669'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            >
              Account Password
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: isDark ? '#64748B' : '#94A3B8',
                marginTop: 2,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Change password or reset via email code
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={isDark ? '#475569' : '#94A3B8'} />
      </TouchableOpacity>
    </View>
  );

  const renderThemeCard = () => (
    <View
      style={{
        backgroundColor: isDark ? '#131A22' : '#FFFFFF',
        borderColor: isDark ? '#222D3D' : '#E7E1D8',
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: 'PlusJakartaSans_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: isDark ? '#64748B' : '#94A3B8',
          marginBottom: 12,
        }}
      >
        Appearance & Theme
      </Text>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
          padding: 4,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDark ? '#222D3D' : '#E7E1D8',
        }}
      >
        {(['system', 'light', 'dark'] as const).map((mode) => {
          const isActive = theme === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => setTheme(mode)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isActive ? '#059669' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  textTransform: 'capitalize',
                  color: isActive ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B',
                }}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderLogoutCard = () => (
    <TouchableOpacity
      onPress={handleLogout}
      activeOpacity={0.75}
      style={{
        backgroundColor: isDark ? '#EF444415' : '#FEF2F2',
        borderColor: isDark ? '#EF444430' : '#FECACA',
        borderWidth: 1,
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 52,
        marginBottom: 16,
      }}
    >
      <LogOut size={16} color="#EF4444" />
      <Text
        style={{
          color: '#EF4444',
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 14,
          marginLeft: 8,
        }}
      >
        Log Out of HaappyConnect
      </Text>
    </TouchableOpacity>
  );

  const renderManagementHub = () => (
    isExpert ? (
      /* EXPERT: Consultancy Suite Controls */
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'PlusJakartaSans_700Bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: isDark ? '#64748B' : '#94A3B8',
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Consultancy Suite
        </Text>

        {/* Edit Professional Listing */}
        <TouchableOpacity
          onPress={() => router.push('/expert/edit-profile')}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: isDark ? '#10B98120' : '#05966915',
                padding: 10,
                borderRadius: 12,
                marginRight: 14,
              }}
            >
              <Sparkles size={18} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                Advisory Profile & Bio
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#64748B' : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Headline, specialties & background
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={isDark ? '#475569' : '#94A3B8'} />
        </TouchableOpacity>

        {/* Time Rates & Services (₦) */}
        <View
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: isDark ? '#F59E0B20' : '#F59E0B15',
                padding: 8,
                borderRadius: 10,
                marginRight: 10,
              }}
            >
              <Banknote size={16} color="#F59E0B" />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            >
              Advisory Rates (Naira ₦)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <PhoneCall size={11} color={isDark ? '#34D399' : '#059669'} />
                <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter_500Medium' }}>1:1 Call</Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  marginTop: 4,
                }}
              >
                ₦{profile?.hourlyRate || 0}/hr
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Headphones size={11} color="#F59E0B" />
                <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter_500Medium' }}>Voice Note</Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  marginTop: 4,
                }}
              >
                ₦{profile?.videoResponsePrice || 0}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={11} color="#60A5FA" />
                <Text style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter_500Medium' }}>Written</Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  marginTop: 4,
                }}
              >
                ₦{profile?.textQuestionPrice || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Call Availability & Slots */}
        <TouchableOpacity
          onPress={() => router.push('/expert/availability')}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: isDark ? '#10B98120' : '#05966915',
                padding: 10,
                borderRadius: 12,
                marginRight: 14,
              }}
            >
              <CalendarDays size={18} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                Office Hours & Availability
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#64748B' : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Weekly consultation booking slots
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={isDark ? '#475569' : '#94A3B8'} />
        </TouchableOpacity>

        {/* Wallet & Financial Receipts Shortcut for Experts */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/wallet')}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: isDark ? '#F59E0B20' : '#F59E0B15',
                padding: 10,
                borderRadius: 12,
                marginRight: 14,
              }}
            >
              <Wallet size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                Earnings Wallet & Payouts (₦)
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#64748B' : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Available balance, pending escrow & withdrawal
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={isDark ? '#475569' : '#94A3B8'} />
        </TouchableOpacity>
      </View>
    ) : (
      /* SEEKER: My Space & Growth Controls */
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'PlusJakartaSans_700Bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: isDark ? '#64748B' : '#94A3B8',
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          My Learning Journey
        </Text>

        {/* Edit Goals & Ambitions */}
        <TouchableOpacity
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: isDark ? '#10B98120' : '#05966915',
                padding: 10,
                borderRadius: 12,
                marginRight: 14,
              }}
            >
              <Sparkles size={18} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                Learning Goals & Preferences
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#64748B' : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {profile?.goals ? profile.goals.slice(0, 42) + '...' : 'Define what you want to achieve'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={isDark ? '#475569' : '#94A3B8'} />
        </TouchableOpacity>

        {/* Wallet & Financial Receipts Shortcut */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/wallet')}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: isDark ? '#F59E0B20' : '#F59E0B15',
                padding: 10,
                borderRadius: 12,
                marginRight: 14,
              }}
            >
              <Wallet size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              >
                Naira Wallet & Receipts (₦)
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#64748B' : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                Deposit funds, view escrow & history
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={isDark ? '#475569' : '#94A3B8'} />
        </TouchableOpacity>
      </View>
    )
  );

  return (
    <AppScreen 
      contentContainerStyle={{ 
        paddingHorizontal: isDesktop ? 32 : 16, 
        paddingVertical: 16, 
        paddingBottom: 60,
        maxWidth: isDesktop ? '100%' : 640,
        alignSelf: 'center',
        width: '100%' 
      }}
    >
      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start', width: '100%' }}>
          {/* Left Column: Identity, Security, Theme, Logout */}
          <View style={{ width: 360 }}>
            {renderIdentityCard()}
            {renderSecurityCard()}
            {renderThemeCard()}
            {renderLogoutCard()}
          </View>

          {/* Right Column: Consultancy Suite or Seeker Hub */}
          <View style={{ flex: 1 }}>
            {renderManagementHub()}
          </View>
        </View>
      ) : (
        <View>
          {renderIdentityCard()}
          {renderManagementHub()}
          {renderSecurityCard()}
          {renderThemeCard()}
          {renderLogoutCard()}
        </View>
      )}

      {/* Password Change / Recovery Modal */}
      <PasswordChangeModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        userEmail={user?.email || ''}
      />

      {/* Seeker Edit Goals & Ambition Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
        transparent={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                borderWidth: 1,
                borderRadius: 24,
                padding: 22,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: 'PlusJakartaSans_700Bold',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  }}
                >
                  Learning Space Settings
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={{
                    backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Profile Picture */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
                    borderWidth: 1,
                    borderColor: isDark ? '#222D3D' : '#E7E1D8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <User size={36} color={isDark ? '#475569' : '#94A3B8'} />
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handlePickImage(true)}
                    style={{
                      backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
                      borderColor: isDark ? '#222D3D' : '#E7E1D8',
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Camera size={14} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePickImage(false)}
                    style={{
                      backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
                      borderColor: isDark ? '#222D3D' : '#E7E1D8',
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <ImageIcon size={14} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                      From Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Display Name */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter_600SemiBold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: isDark ? '#94A3B8' : '#64748B',
                    marginBottom: 8,
                  }}
                >
                  Full Name *
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                    borderColor: isDark ? '#222D3D' : '#E7E1D8',
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <User size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    style={{
                      flex: 1,
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      marginLeft: 10,
                      fontSize: 15,
                      fontFamily: 'Inter_400Regular',
                    }}
                  />
                </View>
              </View>

              {/* Learning Goals */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter_600SemiBold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: isDark ? '#94A3B8' : '#64748B',
                    marginBottom: 8,
                  }}
                >
                  Learning Ambitions & Goals
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                    borderColor: isDark ? '#222D3D' : '#E7E1D8',
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    height: 110,
                  }}
                >
                  <FileText size={18} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginTop: 2 }} />
                  <TextInput
                    value={goals}
                    onChangeText={setGoals}
                    placeholder="What skills or advice are you seeking from mentors?"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    multiline
                    numberOfLines={4}
                    style={{
                      flex: 1,
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      marginLeft: 10,
                      fontSize: 14,
                      fontFamily: 'Inter_400Regular',
                      textAlignVertical: 'top',
                      height: '100%',
                    }}
                  />
                </View>
              </View>

              {/* Communication Style */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter_600SemiBold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: isDark ? '#94A3B8' : '#64748B',
                    marginBottom: 10,
                  }}
                >
                  Preferred Consultation Format
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? '#0B0F14' : '#F3EFEA',
                    borderColor: isDark ? '#222D3D' : '#E7E1D8',
                    borderWidth: 1,
                    padding: 4,
                    borderRadius: 14,
                  }}
                >
                  {(['Text', 'Voice', 'Video', 'Any'] as const).map((style) => (
                    <TouchableOpacity
                      key={style}
                      onPress={() => setCommunicationStyle(style)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: communicationStyle === style ? '#059669' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_600SemiBold',
                          color: communicationStyle === style ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B',
                        }}
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
                activeOpacity={0.7}
                style={{
                  width: '100%',
                  paddingVertical: 16,
                  backgroundColor: '#059669',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'PlusJakartaSans_700Bold',
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}
