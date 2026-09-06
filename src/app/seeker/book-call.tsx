import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Profile } from '@/types';
import { CalendarDays, Clock, ShieldAlert, Sparkles, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import AppScreen from '@/components/ui/AppScreen';

export default function BookCallModal() {
  const { expertId } = useLocalSearchParams<{ expertId: string }>();
  const router = useRouter();
  const [expert, setExpert] = useState<Profile | null>(null);
  const [expertUserId, setExpertUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Form states
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [dateOptions] = useState<Date[]>(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const getSelectedDateString = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchSlots = async () => {
      if (!expertUserId) return;
      setIsLoadingSlots(true);
      try {
        const dateStr = getSelectedDateString();
        const data = await api.get(`/booking/availability/${expertUserId}?date=${dateStr}`);
        setAvailableSlots(data);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [expertUserId, selectedDate]);

  useEffect(() => {
    const fetchExpertDetails = async () => {
      if (!expertId) return;
      setIsLoading(true);
      try {
        const data = await api.get(`/expert/${expertId}`);
        setExpert(data);
        const uid = typeof data.user === 'string' ? data.user : data.user?._id || data.user?.id || '';
        setExpertUserId(uid);
      } catch (err) {
        console.error('Error fetching expert:', err);
        Alert.alert('Error', 'Expert not found');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpertDetails();
  }, [expertId]);

  const hourlyRate = expert?.hourlyRate || 0;
  const price = Math.round((hourlyRate / 60) * duration);

  const handleBookCall = async () => {
    if (!selectedSlot) {
      Alert.alert('Validation Error', 'Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const date = new Date(selectedDate);
      const [time, modifier] = selectedSlot.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);

      await api.post('/booking', {
        expertId: expertUserId,
        scheduledAt: date.toISOString(),
        durationMinutes: duration,
      });

      Alert.alert('Call Booked', 'Your live consultation has been booked and funds placed in escrow. The expert has been notified.', [
        {
          text: 'View Consultation',
          onPress: () => {
            router.replace({ pathname: '/(tabs)/bookings', params: { tab: 'calls' } } as any);
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
      <View className="flex-1 bg-alabaster dark:bg-obsidian justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs mt-3">Loading schedule...</Text>
      </View>
    );
  }

  return (
    <AppScreen
      scrollable
      className="px-6 pt-4"
      bottomAction={
        <TouchableOpacity
          onPress={handleBookCall}
          disabled={submitting || !selectedSlot}
          className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${
            !selectedSlot ? 'bg-primary-500/40' : 'bg-primary-500 shadow-primary-500/20'
          }`}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Sparkles size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-display font-bold text-base">
                Book Live Call (₦{price.toLocaleString()})
              </Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      {/* Back button and title */}
      <View className="flex-row items-center mb-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3"
        >
          <ChevronLeft size={20} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <Text className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Book 1:1 Live Call
        </Text>
      </View>

      {/* Target Expert Summary Card */}
      {expert && (
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 mb-6 flex-row items-center shadow-sm">
          <View className="w-10 h-10 rounded-2xl bg-primary-500/10 items-center justify-center mr-3">
            <CalendarDays size={22} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Consulting With
            </Text>
            <Text className="text-slate-900 dark:text-white font-display font-bold text-base mt-0.5">
              {expert.fullName}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-sans" numberOfLines={1}>
              {expert.headline}
            </Text>
          </View>
        </View>
      )}

      {/* Duration Selector */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
        Call Duration
      </Text>
      <View className="flex-row mb-6 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[15, 30, 60].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDuration(d as any)}
            className={`flex-1 py-3 rounded-xl items-center justify-center ${
              duration === d ? 'bg-primary-500' : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-bold text-sm ${
                duration === d ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {d} Min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scheduled Day Selector */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
        Select Date
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 -mx-2 px-2">
        {dateOptions.map((date) => {
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const today = new Date();
          const isToday = date.toDateString() === today.toDateString();
          const dayName = isToday
            ? 'Today'
            : date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = date.getDate();

          return (
            <TouchableOpacity
              key={date.toISOString()}
              onPress={() => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              className={`items-center justify-center p-3 rounded-2xl mr-2.5 min-w-[62px] border ${
                isSelected
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  isSelected ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {dayName}
              </Text>
              <Text
                className={`text-lg font-black mt-0.5 ${
                  isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Available Slots */}
      <Text className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
        Available Times
      </Text>
      {isLoadingSlots ? (
        <View className="py-6 items-center w-full">
          <ActivityIndicator color="#059669" size="small" />
        </View>
      ) : availableSlots.length === 0 ? (
        <View className="py-6 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl items-center w-full mb-6">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            No open time slots found for this date
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 mb-6">
          {availableSlots.map((slot) => {
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
                <Clock
                  size={14}
                  color={isSelected ? '#fff' : isDark ? '#64748b' : '#94a3b8'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-sm font-semibold ml-1 ${
                    isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Escrow Guarantee Card */}
      <View className="flex-row items-start bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl mb-8">
        <ShieldAlert size={20} color="#059669" style={{ marginTop: 2 }} />
        <View className="flex-1 ml-3">
          <Text className="text-emerald-900 dark:text-emerald-300 font-bold text-xs">
            Escrow Protection Guarantee
          </Text>
          <Text className="text-emerald-800 dark:text-emerald-400/80 text-[11px] mt-1 leading-relaxed">
            Payment of ₦{price.toLocaleString()} is safely escrowed upon booking. If either party cancels prior to the session, funds are refunded back to your wallet immediately.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
