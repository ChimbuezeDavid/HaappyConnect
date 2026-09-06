import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, MessageSquare, PhoneCall, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useColorScheme } from 'nativewind';

interface Slide {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
}

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' || width >= 768;
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const slides: Slide[] = [
    {
      title: 'Expert Access',
      subtitle: 'On Demand',
      description:
        'Connect with top tech founders, coaches, and financial advisors for personalized 1:1 paid advice.',
      icon: <Sparkles size={32} color="#059669" />,
      accentColor: '#059669',
    },
    {
      title: 'Ask Anything',
      subtitle: 'Get Answered',
      description:
        'Text, voice, or video, submit your question and pay only when the expert responds.',
      icon: <MessageSquare size={32} color="#0ea5e9" />,
      accentColor: '#0ea5e9',
    },
    {
      title: 'Live Calls',
      subtitle: 'Face to Face',
      description:
        'Book scheduled video consultations through integrated calendar and video rooms.',
      icon: <PhoneCall size={32} color="#10b981" />,
      accentColor: '#10b981',
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * width,
        animated: true,
      });
    } else {
      useAuthStore.getState().setGuest(true);
      router.replace('/(tabs)' as any);
    }
  };

  const currentSlide = slides[activeIndex];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Brand */}
      <View
        style={{
          paddingTop: 64,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}
        accessible={true}
        accessibilityRole="header"
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            color: isDark ? '#fff' : '#0f172a',
            letterSpacing: -0.5,
          }}
        >
          Haappy
          <Text style={{ color: '#059669' }}>Connect</Text>
        </Text>
      </View>

      {/* Carousel or Side-by-Side Cards */}
      {isDesktop ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 }}>
          <View style={{ flexDirection: 'row', gap: 24, maxWidth: 1000, width: '100%' }}>
            {slides.map((slide, idx) => (
              <View
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderWidth: 1,
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  borderRadius: 24,
                  padding: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0 : 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    backgroundColor: `${slide.accentColor}15`,
                    borderWidth: 1,
                    borderColor: `${slide.accentColor}30`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  {slide.icon}
                </View>

                {/* Title block */}
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: isDark ? '#fff' : '#0f172a',
                    textAlign: 'center',
                    letterSpacing: -0.5,
                    lineHeight: 28,
                  }}
                >
                  {slide.title}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: slide.accentColor,
                    textAlign: 'center',
                    letterSpacing: -0.5,
                    lineHeight: 28,
                    marginBottom: 12,
                  }}
                >
                  {slide.subtitle}
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#94a3b8' : '#475569',
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  {slide.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            accessibilityRole="adjustable"
            accessibilityLabel={`Feature carousel, slide ${activeIndex + 1} of ${slides.length}`}
            accessibilityHint="Swipe left or right to browse features"
          >
            {slides.map((slide, idx) => (
              <View
                key={idx}
                style={{
                  width: width,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessible={true}
                accessibilityLabel={`${slide.title} ${slide.subtitle}. ${slide.description}`}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    backgroundColor: `${slide.accentColor}15`,
                    borderWidth: 1,
                    borderColor: `${slide.accentColor}30`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 32,
                  }}
                >
                  {slide.icon}
                </View>

                {/* Title block */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '900',
                    color: isDark ? '#fff' : '#0f172a',
                    textAlign: 'center',
                    letterSpacing: -1,
                    lineHeight: 38,
                  }}
                >
                  {slide.title}
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '900',
                    color: slide.accentColor,
                    textAlign: 'center',
                    letterSpacing: -1,
                    lineHeight: 38,
                    marginBottom: 16,
                  }}
                >
                  {slide.subtitle}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: isDark ? '#94a3b8' : '#475569',
                    textAlign: 'center',
                    lineHeight: 24,
                    paddingHorizontal: 8,
                  }}
                >
                  {slide.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom section */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {/* Dots */}
        {!isDesktop && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginBottom: 32,
              gap: 8,
            }}
            accessible={true}
            accessibilityLabel={`Page ${activeIndex + 1} of ${slides.length}`}
          >
            {slides.map((_, idx) => (
              <View
                key={idx}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: activeIndex === idx ? 24 : 6,
                  backgroundColor: activeIndex === idx ? currentSlide.accentColor : (isDark ? '#1e293b' : '#cbd5e1'),
                }}
              />
            ))}
          </View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          onPress={() => {
            if (isDesktop || activeIndex === slides.length - 1) {
              useAuthStore.getState().setGuest(true);
              router.replace('/(tabs)' as any);
            } else {
              handleNext();
            }
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isDesktop || activeIndex === slides.length - 1 ? 'Get started' : 'Next'}
          style={{
            backgroundColor: isDesktop ? '#059669' : currentSlide.accentColor,
            paddingVertical: 18,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 56,
            maxWidth: isDesktop ? 400 : undefined,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '700',
              marginRight: 8,
            }}
          >
            {isDesktop || activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
