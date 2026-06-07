import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

export default function Confetti() {
  const particles = useRef<Particle[]>(
    Array.from({ length: 60 }).map((_, index) => ({
      id: index,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 800,
      duration: Math.random() * 1500 + 1500,
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT + 50,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(rotate, {
            toValue: 1,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(opacity, {
            toValue: 0,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        top: translateY,
        width: particle.size,
        height: particle.size * 1.5,
        backgroundColor: particle.color,
        opacity: opacity,
        transform: [{ rotate: spin }],
        borderRadius: 2,
      }}
    />
  );
}
