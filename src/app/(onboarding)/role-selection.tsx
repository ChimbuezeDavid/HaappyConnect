import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GraduationCap, Briefcase, Check, ArrowRight, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppScreen from '@/components/ui/AppScreen';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateDraft, role: storeRole } = useOnboardingStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'expert' | null>(null);

  // Pre-select based on existing register selection or store draft
  useEffect(() => {
    if (storeRole) {
      setSelectedRole(storeRole);
    } else if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user, storeRole]);

  const handleContinue = () => {
    if (!selectedRole) return;
    
    // Save to Zustand onboarding store draft
    updateDraft({ role: selectedRole });
    
    // Go to next wizard setup flow
    router.push('/(onboarding)/wizard' as any);
  };

  return (
    <AppScreen contentContainerStyle={{ justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 }}>
      <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View 
            style={{
              backgroundColor: isDark ? '#10B98120' : '#05966915',
              borderColor: isDark ? '#10B98135' : '#05966925',
              borderWidth: 1,
              padding: 14,
              borderRadius: 20,
              marginBottom: 16,
            }}
          >
            <Sparkles size={28} color={isDark ? '#34D399' : '#059669'} />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontFamily: 'PlusJakartaSans_700Bold',
              color: isDark ? '#F8FAFC' : '#0F172A',
              textAlign: 'center',
              letterSpacing: -0.5,
            }}
          >
            Choose Your Role
          </Text>
          <Text
            style={{
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'center',
              marginTop: 8,
              fontSize: 14,
              lineHeight: 22,
              fontFamily: 'Inter_400Regular',
              maxWidth: 340,
            }}
          >
            Select how you would like to experience HaappyConnect. Connect with verified mentors or share your expertise.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={{ gap: 14, marginBottom: 32 }}>
          {/* Seeker Card */}
          <TouchableOpacity
            onPress={() => setSelectedRole('seeker')}
            activeOpacity={0.8}
            style={{
              backgroundColor: selectedRole === 'seeker' 
                ? (isDark ? '#131A22' : '#FFFFFF') 
                : (isDark ? '#0B0F14' : '#FFFFFF'),
              borderColor: selectedRole === 'seeker' 
                ? '#059669' 
                : (isDark ? '#222D3D' : '#E7E1D8'),
              borderWidth: selectedRole === 'seeker' ? 2 : 1,
              borderRadius: 24,
              padding: 22,
              position: 'relative',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selectedRole === 'seeker' ? 0.15 : 0,
              shadowRadius: 10,
              elevation: selectedRole === 'seeker' ? 4 : 0,
            }}
          >
            {selectedRole === 'seeker' && (
              <View
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  backgroundColor: '#059669',
                  padding: 4,
                  borderRadius: 12,
                }}
              >
                <Check size={12} color="#FFFFFF" />
              </View>
            )}
            
            <View 
              style={{
                backgroundColor: selectedRole === 'seeker' 
                  ? (isDark ? '#10B98125' : '#05966915') 
                  : (isDark ? '#1B2430' : '#F3EFEA'),
                width: 48,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <GraduationCap size={24} color={selectedRole === 'seeker' ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#94A3B8')} />
            </View>

            <Text
              style={{
                fontSize: 18,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F8FAFC' : '#0F172A',
                marginBottom: 4,
              }}
            >
              I'm a Seeker
            </Text>
            <Text
              style={{
                color: isDark ? '#34D399' : '#059669',
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                marginBottom: 6,
              }}
            >
              Find guidance, answers & mentorship
            </Text>
            <Text
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
                fontSize: 13,
                lineHeight: 19,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Ask written or voice questions, schedule 1:1 live calls, and learn from verified industry professionals.
            </Text>
          </TouchableOpacity>

          {/* Expert Card */}
          <TouchableOpacity
            onPress={() => setSelectedRole('expert')}
            activeOpacity={0.8}
            style={{
              backgroundColor: selectedRole === 'expert' 
                ? (isDark ? '#131A22' : '#FFFFFF') 
                : (isDark ? '#0B0F14' : '#FFFFFF'),
              borderColor: selectedRole === 'expert' 
                ? '#059669' 
                : (isDark ? '#222D3D' : '#E7E1D8'),
              borderWidth: selectedRole === 'expert' ? 2 : 1,
              borderRadius: 24,
              padding: 22,
              position: 'relative',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selectedRole === 'expert' ? 0.15 : 0,
              shadowRadius: 10,
              elevation: selectedRole === 'expert' ? 4 : 0,
            }}
          >
            {selectedRole === 'expert' && (
              <View
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  backgroundColor: '#059669',
                  padding: 4,
                  borderRadius: 12,
                }}
              >
                <Check size={12} color="#FFFFFF" />
              </View>
            )}
            
            <View 
              style={{
                backgroundColor: selectedRole === 'expert' 
                  ? (isDark ? '#10B98125' : '#05966915') 
                  : (isDark ? '#1B2430' : '#F3EFEA'),
                width: 48,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Briefcase size={24} color={selectedRole === 'expert' ? (isDark ? '#34D399' : '#059669') : (isDark ? '#64748B' : '#94A3B8')} />
            </View>

            <Text
              style={{
                fontSize: 18,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: isDark ? '#F8FAFC' : '#0F172A',
                marginBottom: 4,
              }}
            >
              I'm an Expert
            </Text>
            <Text
              style={{
                color: isDark ? '#34D399' : '#059669',
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                marginBottom: 6,
              }}
            >
              Monetize your time & empower talent
            </Text>
            <Text
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
                fontSize: 13,
                lineHeight: 19,
                fontFamily: 'Inter_400Regular',
              }}
            >
              Configure your advisory rates (Naira ₦), answer voice memos, host live sessions, and receive bank payouts.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.8}
          style={{
            backgroundColor: !selectedRole ? (isDark ? '#1B2430' : '#E7E1D8') : '#059669',
            paddingVertical: 18,
            borderRadius: 18,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: selectedRole ? 0.25 : 0,
            shadowRadius: 8,
            elevation: selectedRole ? 4 : 0,
          }}
        >
          <Text 
            style={{
              color: selectedRole ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8'),
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 16,
              marginRight: 8,
            }}
          >
            Continue to Profile Setup
          </Text>
          <ArrowRight size={18} color={selectedRole ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')} />
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
