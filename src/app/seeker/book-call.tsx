import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { CalendarDays, Clock, ShieldAlert, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function BookCallModal() {
  const { expertId } = useLocalSearchParams<{ expertId: string }>();
  const router = useRouter();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Mock available slots
  const slots = {
    today: ['10:00 AM', '1:30 PM', '3:00 PM', '4:30 PM'],
    tomorrow: ['9:00 AM', '11:00 AM', '2:00 PM', '5:30 PM'],
  };

  useEffect(() => {
    const fetchExpertDetails = async () => {
      if (!expertId) return;
      setIsLoading(true);
      try {
        const list = await api.get(`/expert/discover`);
        const found = list.find((p: Profile) => 
          typeof p.user === 'string' 
            ? p.user === expertId 
            : (p.user as any)?._id === expertId || (p.user as any)?.id === expertId
        );
        if (found) {
          setExpert(found);
        } else {
          Alert.alert('Error', 'Expert not found');
          router.back();
        }
      } catch (err) {
        console.error('Error fetching expert:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetails();
  }, [expertId]);

  const handleBookCall = async () => {
    if (!selectedSlot) {
      Alert.alert('Validation Error', 'Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate date scheduled time
      const date = new Date();
      if (selectedDay === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      }
      
      const [time, modifier] = selectedSlot.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);

      await api.post('/booking', {
        expertId,
        scheduledAt: date.toISOString(),
        durationMinutes: duration,
      });

      Alert.alert('Success', 'Your live call booking has been submitted. Wait for the expert to confirm.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/bookings');
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message || 'Server error booking call');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-955 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const hourlyRate = expert?.hourlyRate || 0;
  const price = (hourlyRate / 60) * duration;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-955">
      <ScrollView
        className="flex-1 w-full max-w-2xl self-center"
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 24, paddingTop: 24 }}
      >
      {/* Expert Profile Banner */}
      {expert && (
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 flex-row items-center shadow-sm dark:shadow-none">
          <CalendarDays size={24} color="#8b5cf6" />
          <View className="ml-4 flex-1">
            <Text className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Booking Call With</Text>
            <Text className="text-slate-900 dark:text-white font-bold text-base mt-0.5">{expert.fullName}</Text>
            <Text className="text-slate-500 dark:text-slate-500 text-xs" numberOfLines={1}>{expert.headline}</Text>
          </View>
        </View>
      )}

      {/* Duration Selector */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Call Duration</Text>
      <View className="flex-row mb-6 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-850">
        {[15, 30, 60].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDuration(d as any)}
            className={`flex-1 py-3 rounded-xl items-center justify-center ${
              duration === d ? 'bg-primary-500' : 'bg-transparent'
            }`}
          >
            <Text className={`font-bold text-sm ${duration === d ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {d} Min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scheduled Day Selector */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Date</Text>
      <View className="flex-row mb-4 space-x-3">
        <TouchableOpacity
          onPress={() => {
            setSelectedDay('today');
            setSelectedSlot(null);
          }}
          className={`flex-1 bg-white dark:bg-slate-900 border p-4 rounded-2xl mr-2 items-center justify-center ${
            selectedDay === 'today' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <Text className={`font-bold text-sm ${selectedDay === 'today' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSelectedDay('tomorrow');
            setSelectedSlot(null);
          }}
          className={`flex-1 bg-white dark:bg-slate-900 border p-4 rounded-2xl items-center justify-center ${
            selectedDay === 'tomorrow' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <Text className={`font-bold text-sm ${selectedDay === 'tomorrow' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Tomorrow</Text>
        </TouchableOpacity>
      </View>

      {/* Available Slots Selector */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Available Times</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {slots[selectedDay].map((slot) => {
          const isSelected = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              onPress={() => setSelectedSlot(slot)}
              className={`flex-row items-center px-4 py-3 rounded-2xl border ${
                isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
              style={{ width: '47%' }}
            >
              <Clock size={14} color={isSelected ? '#fff' : (isDark ? '#64748b' : '#94a3b8')} style={{ marginRight: 6 }} />
              <Text className={`text-sm ml-1.5 ${isSelected ? 'text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Charge Warning */}
      <View className="flex-row items-start bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 shadow-sm dark:shadow-none">
        <ShieldAlert size={20} color="#10b981" style={{ marginTop: 2 }} />
        <View className="flex-1 ml-3">
          <Text className="text-slate-900 dark:text-white font-bold text-xs">Platform Guarantee</Text>
          <Text className="text-slate-600 dark:text-slate-450 text-[11px] mt-1 leading-relaxed">
            You will only be charged when the expert confirms the call. If the booking is cancelled by you or the expert, the price of ₦{price.toFixed(2)} will be refunded to your wallet balance.
          </Text>
        </View>
      </View>

      {/* Booking Submission button */}
      <TouchableOpacity
        onPress={handleBookCall}
        disabled={submitting || !selectedSlot}
        className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg mb-12 ${
          !selectedSlot ? 'bg-primary-500/50' : 'bg-primary-500 shadow-primary-500'
        }`}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Sparkles size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white font-bold text-lg">Book Live Call (₦{price.toFixed(2)})</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  </View>
  );
}
