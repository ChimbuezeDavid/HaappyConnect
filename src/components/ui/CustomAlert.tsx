import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useAlertStore, AlertButton } from '@/store/alertStore';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Info } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

function getAlertIcon(title: string, isDark: boolean) {
  const size = 38;
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('success') || lowerTitle.includes('verified') || lowerTitle.includes('completed') || lowerTitle.includes('submitted')) {
    return <CheckCircle size={size} color="#10b981" />;
  }
  if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('denied') || lowerTitle.includes('insufficient')) {
    return <XCircle size={size} color="#ef4444" />;
  }
  if (lowerTitle.includes('warning') || lowerTitle.includes('caution') || lowerTitle.includes('limit') || lowerTitle.includes('required')) {
    return <AlertTriangle size={size} color="#f59e0b" />;
  }
  if (lowerTitle.includes('sure') || lowerTitle.includes('confirm') || lowerTitle.includes('logout') || lowerTitle.includes('exit')) {
    return <HelpCircle size={size} color="#3b82f6" />;
  }
  return <Info size={size} color="#8b5cf6" />;
}

export default function CustomAlertContainer() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Local state to keep the modal mounted during exit animations
  const [localVisible, setLocalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      // Spring in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        })
      ]).start();
    } else if (localVisible) {
      // Scale out and fade out before unmounting
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        })
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [visible]);

  if (!localVisible) return null;

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      // Give time for the animation to transition
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  // Styles dynamically adjusted for theme
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const titleColor = isDark ? '#f8fafc' : '#0f172a';
  const messageColor = isDark ? '#94a3b8' : '#475569';

  // Render buttons layout (horizontal if <= 2 buttons, vertical if more)
  const isHorizontalLayout = buttons.length <= 2;

  return (
    <Modal
      transparent
      visible={localVisible}
      animationType="none"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        {/* Animated backdrop */}
        <Animated.View style={[styles.backdrop, { opacity }]} />

        {/* Animated card container */}
        <Animated.View 
          style={[
            styles.card, 
            { 
              backgroundColor: cardBg, 
              borderColor,
              transform: [{ scale }],
              opacity
            }
          ]}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            {getAlertIcon(title, isDark)}
          </View>

          {/* Dialog Title */}
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>

          {/* Dialog Message */}
          {message ? (
            <Text style={[styles.message, { color: messageColor }]}>{message}</Text>
          ) : null}

          {/* Action Buttons Row/Column */}
          <View style={isHorizontalLayout ? styles.buttonRow : styles.buttonCol}>
            {buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              let btnBg = '#8b5cf6'; // default primary
              let textColor = '#ffffff';
              let borderStyle = {};

              if (isDestructive) {
                btnBg = '#ef4444';
              } else if (isCancel) {
                btnBg = isDark ? '#334155' : '#f1f5f9';
                textColor = isDark ? '#cbd5e1' : '#475569';
              }

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.75}
                  onPress={() => handleButtonPress(btn)}
                  style={[
                    styles.button,
                    { backgroundColor: btnBg, flex: isHorizontalLayout ? 1 : 0 },
                    borderStyle
                  ]}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    })
  } as any,
  title: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonCol: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  button: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
