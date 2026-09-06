import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useNotificationStore, AppNotification } from '@/store/notificationStore';
import { Bell, CheckCircle, XCircle, Calendar, MessageSquare, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const TOAST_DURATION = 4500; // ms

function getIcon(type: AppNotification['type'], isDark: boolean) {
  const size = 20;
  switch (type) {
    case 'question_answered':
      return <CheckCircle size={size} color="#10b981" />;
    case 'question_declined':
      return <XCircle size={size} color="#ef4444" />;
    case 'new_question':
      return <MessageSquare size={size} color="#059669" />;
    case 'new_booking':
    case 'booking_confirmed':
      return <Calendar size={size} color="#3b82f6" />;
    case 'booking_cancelled':
      return <XCircle size={size} color="#ef4444" />;
    case 'booking_completed':
      return <CheckCircle size={size} color="#10b981" />;
    case 'deposit_verified':
      return <CheckCircle size={size} color="#10b981" />;
    default:
      return <Bell size={size} color="#059669" />;
  }
}

function ToastItem({ notification }: { notification: AppNotification }) {
  const { dismissToast } = useNotificationStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => dismissToast(notification.id));
  };

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after TOAST_DURATION
    const timer = setTimeout(() => handleDismiss(), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[{ transform: [{ translateY }], opacity }]}
      className="mx-4 mb-2"
    >
      <View
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          {getIcon(notification.type, isDark)}
        </View>

        {/* Text */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '700', fontSize: 14 }}
          >
            {notification.title}
          </Text>
          <Text
            numberOfLines={2}
            style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, marginTop: 2, lineHeight: 16 }}
          >
            {notification.body}
          </Text>
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            padding: 4,
            borderRadius: 8,
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
          }}
        >
          <X size={14} color={isDark ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function ToastNotificationContainer() {
  const { toastQueue } = useNotificationStore();

  if (toastQueue.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: Platform.OS === 'web' ? 16 : 56,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
        maxWidth: 480,
        alignSelf: 'center',
        width: '100%',
      }}
      pointerEvents="box-none"
    >
      {/* Show latest toast on top */}
      {toastQueue.slice(-3).reverse().map((notif) => (
        <ToastItem key={notif.id} notification={notif} />
      ))}
    </View>
  );
}
