import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, StyleSheet, ActivityIndicator } from 'react-native';

interface SplashScreenOverlayProps {
  isVisible: boolean;
}

export const SplashScreenOverlay: React.FC<SplashScreenOverlayProps> = ({ isVisible }) => {
  const [mounted, setMounted] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Gentle pulsing brand badge animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.04,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim]);

  useEffect(() => {
    if (!isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
      });
    }
  }, [isVisible, fadeAnim]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Glowing Squircle Brand Logo */}
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Name */}
        <Text style={styles.title}>Happy Connect</Text>
        <Text style={styles.subtitle}>EXPERT CONSULTATIONS & MENTORSHIP</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Elevate your growth</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#061431',
    zIndex: 999999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: '#0d47a1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 28,
  },
  loadingWrapper: {
    marginTop: 8,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 44,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.55)',
    letterSpacing: 1,
  },
});

