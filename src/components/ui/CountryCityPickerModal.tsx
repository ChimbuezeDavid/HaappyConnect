import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Search, X, ChevronRight, ArrowLeft, Check, Globe, MapPin } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

// Curated data set of countries and major cities
const COUNTRIES_DATA: Record<string, string[]> = {
  Nigeria: [
    'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Benin City', 'Enugu', 'Kano',
    'Kaduna', 'Abeokuta', 'Asaba', 'Warri', 'Calabar', 'Uyo', 'Owerri', 'Akure',
    'Jos', 'Ilorin', 'Onitsha', 'Zaria', 'Maiduguri', 'Other City'
  ],
  'United Kingdom': [
    'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Leeds',
    'Bristol', 'Liverpool', 'Newcastle', 'Belfast', 'Cardiff', 'Cambridge',
    'Oxford', 'Sheffield', 'Other City'
  ],
  'United States': [
    'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Austin', 'Seattle',
    'Boston', 'Atlanta', 'Miami', 'Dallas', 'Houston', 'Denver', 'Washington D.C.',
    'San Diego', 'Philadelphia', 'Other City'
  ],
  Canada: [
    'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton',
    'Quebec City', 'Winnipeg', 'Halifax', 'Other City'
  ],
  Ghana: [
    'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema', 'Cape Coast', 'Sunyani', 'Other City'
  ],
  Kenya: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Other City'
  ],
  'South Africa': [
    'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'Other City'
  ],
  Rwanda: [
    'Kigali', 'Butare', 'Gisenyi', 'Ruhengeri', 'Other City'
  ],
  Germany: [
    'Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Stuttgart', 'Other City'
  ],
  France: [
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nice', 'Other City'
  ],
  Ireland: [
    'Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Other City'
  ],
  'United Arab Emirates': [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Other City'
  ],
  Australia: [
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Other City'
  ],
  India: [
    'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Other City'
  ],
  Other: [
    'Remote / Global', 'Other International City'
  ]
};

const COUNTRY_LIST = Object.keys(COUNTRIES_DATA);

interface CountryCityPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (formattedLocation: string) => void;
  initialLocation?: string;
}

export default function CountryCityPickerModal({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
}: CountryCityPickerModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState<'country' | 'city'>('country');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customCity, setCustomCity] = useState<string>('');

  const handleReset = () => {
    setStep('country');
    setSelectedCountry('');
    setSearchQuery('');
    setCustomCity('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setSearchQuery('');
    setStep('city');
  };

  const handleCitySelect = (city: string) => {
    if (city === 'Other City' || city === 'Other International City') {
      // Allow custom input
      return;
    }
    const formatted = `${city}, ${selectedCountry}`;
    onSelectLocation(formatted);
    handleClose();
  };

  const handleCustomCityConfirm = () => {
    if (!customCity.trim()) return;
    const formatted = `${customCity.trim()}, ${selectedCountry}`;
    onSelectLocation(formatted);
    handleClose();
  };

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(c =>
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredCities = useMemo(() => {
    if (!selectedCountry) return [];
    const cities = COUNTRIES_DATA[selectedCountry] || [];
    if (!searchQuery.trim()) return cities;
    return cities.filter(c =>
      c.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [selectedCountry, searchQuery]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center items-center bg-black/70 px-4"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FAF8F5',
            maxHeight: '80%',
          }}
          className="w-full max-w-md p-5 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center">
              {step === 'city' ? (
                <TouchableOpacity
                  onPress={() => {
                    setStep('country');
                    setSearchQuery('');
                  }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mr-2.5"
                >
                  <ArrowLeft size={18} color={isDark ? '#FFF' : '#0F172A'} />
                </TouchableOpacity>
              ) : (
                <View className="p-1.5 rounded-full bg-primary-500/10 mr-2.5">
                  <Globe size={18} color="#059669" />
                </View>
              )}
              <View>
                <Text className="text-lg font-black text-slate-900 dark:text-white">
                  {step === 'country' ? 'Select Country' : `Select City in ${selectedCountry}`}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'country'
                    ? 'Choose your country first'
                    : 'Search or tap your city'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <X size={18} color={isDark ? '#FFF' : '#0F172A'} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
            className="flex-row items-center rounded-2xl px-3.5 py-2.5 my-3.5 border"
          >
            <Search size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={step === 'country' ? 'Search country...' : 'Search city or state...'}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              className="flex-1 ml-2.5 text-sm text-slate-900 dark:text-white"
              autoCapitalize="words"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>

          {/* List Content */}
          {step === 'country' ? (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCountrySelect(item)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between py-3.5 px-3 border-b border-slate-100 dark:border-slate-800/80"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={isDark ? '#475569' : '#94A3B8'} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View className="flex-1">
              {/* Custom city input if other */}
              <View className="mb-2">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Or Enter Specific City:
                </Text>
                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    }}
                    className="flex-1 flex-row items-center rounded-2xl px-3 py-2 border"
                  >
                    <MapPin size={16} color="#059669" />
                    <TextInput
                      value={customCity}
                      onChangeText={setCustomCity}
                      placeholder="Type custom city name..."
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      className="flex-1 ml-2 text-sm text-slate-900 dark:text-white"
                    />
                  </View>
                  {customCity.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={handleCustomCityConfirm}
                      className="bg-primary-500 px-4 py-2.5 rounded-2xl flex-row items-center"
                    >
                      <Check size={16} color="#FFF" style={{ marginRight: 4 }} />
                      <Text className="text-white font-bold text-xs">Use</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleCitySelect(item)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between py-3 px-3 border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <View className="flex-row items-center">
                      <MapPin size={14} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
                      <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item}
                      </Text>
                    </View>
                    <Check size={16} color="#059669" />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
