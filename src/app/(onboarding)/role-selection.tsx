import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GraduationCap, Briefcase, Check, ArrowRight, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
      className="bg-slate-50 dark:bg-slate-955 px-6 py-12"
    >
      <View className="max-w-xl w-full self-center">
        {/* Header */}
        <View className="items-center mb-10">
          <View 
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderColor: 'rgba(139, 92, 246, 0.2)',
              borderWidth: 1,
            }}
            className="p-3 rounded-2xl mb-4"
          >
            <Sparkles size={28} color="#8b5cf6" />
          </View>
          <Text className="text-3xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">
            Choose Your Journey
          </Text>
          <Text className="text-slate-600 dark:text-slate-400 text-center mt-2 text-sm leading-relaxed max-w-sm">
            Select how you would like to connect on Haappy-Connect. You can offer expertise or seek consultation.
          </Text>
        </View>

        {/* Cards Row / Column */}
        <View className="space-y-4 md:space-y-0 md:flex-row md:space-x-4 mb-10">
          {/* Seeker Card */}
          <TouchableOpacity
            onPress={() => setSelectedRole('seeker')}
            activeOpacity={0.8}
            style={{
              backgroundColor: selectedRole === 'seeker' ? (isDark ? '#0f172a' : '#f5f3ff') : (isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'),
              borderColor: selectedRole === 'seeker' ? '#8b5cf6' : (isDark ? '#1e293b' : '#e2e8f0'),
              borderWidth: 1.5,
              ...(selectedRole === 'seeker' ? {
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              } : {})
            }}
            className="flex-1 rounded-3xl p-6 relative shadow-sm dark:shadow-none"
          >
            {selectedRole === 'seeker' && (
              <View className="absolute top-4 right-4 bg-violet-500 p-1 rounded-full">
                <Check size={12} color="#fff" />
              </View>
            )}
            
            <View 
              style={{
                backgroundColor: selectedRole === 'seeker' ? 'rgba(139, 92, 246, 0.2)' : (isDark ? '#020617' : '#f1f5f9'),
              }}
              className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
            >
              <GraduationCap size={24} color={selectedRole === 'seeker' ? '#8b5cf6' : (isDark ? '#64748b' : '#94a3b8')} />
            </View>

            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">I'm a Seeker</Text>
            <Text className="text-primary-650 dark:text-primary-400 text-xs font-semibold mb-2">Get expert advice & solutions</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Ask questions, book scheduled video calls, and learn directly from industry professionals.
            </Text>
          </TouchableOpacity>

          {/* Expert Card */}
          <TouchableOpacity
            onPress={() => setSelectedRole('expert')}
            activeOpacity={0.8}
            style={{
              backgroundColor: selectedRole === 'expert' ? (isDark ? '#0f172a' : '#f5f3ff') : (isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'),
              borderColor: selectedRole === 'expert' ? '#8b5cf6' : (isDark ? '#1e293b' : '#e2e8f0'),
              borderWidth: 1.5,
              ...(selectedRole === 'expert' ? {
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              } : {})
            }}
            className="flex-1 rounded-3xl p-6 relative shadow-sm dark:shadow-none"
          >
            {selectedRole === 'expert' && (
              <View className="absolute top-4 right-4 bg-violet-500 p-1 rounded-full">
                <Check size={12} color="#fff" />
              </View>
            )}

            <View 
              style={{
                backgroundColor: selectedRole === 'expert' ? 'rgba(139, 92, 246, 0.2)' : (isDark ? '#020617' : '#f1f5f9'),
              }}
              className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
            >
              <Briefcase size={24} color={selectedRole === 'expert' ? '#8b5cf6' : (isDark ? '#64748b' : '#94a3b8')} />
            </View>

            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">I'm an Expert</Text>
            <Text className="text-primary-655 dark:text-primary-400 text-xs font-semibold mb-2">Share knowledge & earn</Text>
            <Text className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Offer customized consultations, answer client questions, and monetize your professional expertise.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.8}
          style={{
            backgroundColor: !selectedRole ? (isDark ? '#0f172a' : '#e2e8f0') : '#8b5cf6',
            borderColor: !selectedRole ? (isDark ? '#1e293b' : '#cbd5e1') : 'transparent',
            borderWidth: 1,
            ...(selectedRole ? {
              shadowColor: '#8b5cf6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            } : {})
          }}
          className="w-full py-4 rounded-2xl flex-row justify-center items-center"
        >
          <Text className={`font-bold text-base mr-2 ${selectedRole ? 'text-white' : (isDark ? '#475569' : '#94a3b8')}`}>
            Continue
          </Text>
          <ArrowRight size={18} color={selectedRole ? '#fff' : (isDark ? '#475569' : '#94a3b8')} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
