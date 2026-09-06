import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useColorScheme } from 'nativewind';
import { ArrowLeft, Clock, Save, ShieldCheck } from 'lucide-react-native';

interface WeeklyHours {
  dayOfWeek: number;
  enabled: boolean;
  slots: { start: string; end: string }[];
}

const DAYS_OF_WEEK = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' }
];

export default function ExpertAvailabilityScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours[]>([]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const data = await api.get('/booking/my-availability');
        const sorted = DAYS_OF_WEEK.map(({ day }) => {
          const found = data.weeklyHours.find((h: any) => h.dayOfWeek === day);
          return found || { dayOfWeek: day, enabled: false, slots: [] };
        });
        setWeeklyHours(sorted);
      } catch (err) {
        console.error('Error fetching availability:', err);
        Alert.alert('Error', 'Failed to load availability settings.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailability();
  }, []);

  const handleToggleDay = (dayIndex: number) => {
    const updated = [...weeklyHours];
    const day = updated[dayIndex];
    day.enabled = !day.enabled;
    if (day.enabled && day.slots.length === 0) {
      day.slots = [{ start: '09:00', end: '17:00' }];
    }
    setWeeklyHours(updated);
  };

  const handleTimeChange = (dayIndex: number, type: 'start' | 'end', value: string) => {
    const cleanValue = value.replace(/[^0-9:]/g, '').slice(0, 5);
    const updated = [...weeklyHours];
    const day = updated[dayIndex];
    
    if (day.slots.length === 0) {
      day.slots = [{ start: '09:00', end: '17:00' }];
    }

    if (type === 'start') {
      day.slots[0].start = cleanValue;
    } else {
      day.slots[0].end = cleanValue;
    }
    setWeeklyHours(updated);
  };

  const handleSave = async () => {
    for (const day of weeklyHours) {
      if (day.enabled && day.slots.length > 0) {
        const { start, end } = day.slots[0];
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          Alert.alert('Validation Error', `Please enter times in 24h format (HH:MM) for ${DAYS_OF_WEEK.find(d => d.day === day.dayOfWeek)?.name}.`);
          return;
        }

        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        if (startH > endH || (startH === endH && startM >= endM)) {
          Alert.alert('Validation Error', `Start time must be before end time for ${DAYS_OF_WEEK.find(d => d.day === day.dayOfWeek)?.name}.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await api.put('/booking/my-availability', { weeklyHours });
      Alert.alert('Success', 'Availability updated successfully.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save availability settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const backgroundColor = isDark ? '#0B0F14' : '#FAF8F5';
  const headerStyle = {
    backgroundColor: isDark ? '#131A22' : '#ffffff',
    borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
    borderBottomWidth: 1,
  };

  return (
    <View className="flex-1" style={{ backgroundColor }}>
      <View style={headerStyle} className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
            <ArrowLeft size={20} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Call Availability</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          className="bg-primary-500 py-2.5 px-4 rounded-xl flex-row items-center shadow-md shadow-primary-500/20"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-xs font-bold">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 max-w-2xl w-full self-center px-4 py-6" contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 flex-row items-start shadow-sm dark:shadow-none">
          <Clock size={20} color="#059669" style={{ marginTop: 2 }} />
          <View className="ml-4 flex-1">
            <Text className="text-slate-900 dark:text-white font-bold text-sm">Configure Time Windows</Text>
            <Text className="text-slate-500 dark:text-slate-450 text-xs mt-1 leading-relaxed">
              Set the time windows when clients can book 1:1 consultation calls with you. Times must be entered in 24-hour format (e.g. 09:00 to 17:00).
            </Text>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-none">
          {weeklyHours.map((day, idx) => {
            const dayName = DAYS_OF_WEEK[idx].name;
            const slot = day.slots[0] || { start: '09:00', end: '17:00' };

            return (
              <View key={day.dayOfWeek} className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-850/60 py-4 first:pt-0 last:border-b-0 last:pb-0">
                <View className="flex-row items-center flex-1 mr-4">
                  <Switch
                    value={day.enabled}
                    onValueChange={() => handleToggleDay(idx)}
                    trackColor={{ false: '#cbd5e1', true: '#c084fc' }}
                    thumbColor={day.enabled ? '#a855f7' : '#94a3b8'}
                    ios_backgroundColor="#cbd5e1"
                  />
                  <Text className={`font-bold text-sm ml-3.5 ${day.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {dayName}
                  </Text>
                </View>

                {day.enabled && (
                  <View className="flex-row items-center">
                    <TextInput
                      value={slot.start}
                      onChangeText={(val) => handleTimeChange(idx, 'start', val)}
                      placeholder="09:00"
                      maxLength={5}
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-semibold text-slate-850 dark:text-slate-200 w-16"
                    />
                    <Text className="text-slate-400 dark:text-slate-500 text-xs font-bold mx-2">to</Text>
                    <TextInput
                      value={slot.end}
                      onChangeText={(val) => handleTimeChange(idx, 'end', val)}
                      placeholder="17:00"
                      maxLength={5}
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-semibold text-slate-850 dark:text-slate-200 w-16"
                    />
                  </View>
                )}
                {!day.enabled && (
                  <Text className="text-slate-400 dark:text-slate-500 text-xs font-bold">Unavailable</Text>
                )}
              </View>
            );
          })}
        </View>

        <View className="flex-row items-center justify-center mt-6">
          <ShieldCheck size={14} color="#10b981" />
          <Text className="text-[11px] font-bold text-slate-450 dark:text-slate-500 ml-1 uppercase">Calendar Secured</Text>
        </View>
      </ScrollView>
    </View>
  );
}
