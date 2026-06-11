import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { PhoneOff, VideoOff, MicOff, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';

// Animated pulsing timer component (replaces NativeWind animate-pulse which crashes via css-interop)
function PulsingTimer({ text, color }: { text: string; color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.Text style={{ opacity, color, fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 }}>
      {text}
    </Animated.Text>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { meetingLink, durationMinutes, partnerName } = useLocalSearchParams<{
    meetingLink: string;
    durationMinutes: string;
    partnerName: string;
  }>();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request camera and microphone permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.granted);
      const audioStatus = await requestRecordingPermissionsAsync();
      setHasAudioPermission(audioStatus.granted);
    };

    requestPermissions();

    // Initialize countdown timer
    const totalSeconds = parseInt(durationMinutes || '30') * 60;
    setTimeLeft(totalSeconds);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [durationMinutes]);

  // Start countdown when permissions are ready
  useEffect(() => {
    if (hasCameraPermission && hasAudioPermission) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Reached 0: start 60s grace period
            if (!isGracePeriod) {
              setIsGracePeriod(true);
              Alert.alert(
                'Time Limit Reached',
                'Your booked duration has ended. The call will automatically terminate in 60 seconds.'
              );
              return 60; // 60 seconds grace period countdown
            } else {
              // Grace period ended -> automatically hang up
              clearInterval(timerRef.current!);
              Alert.alert('Call Expired', 'The consultation call time limit was reached.');
              router.back();
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasCameraPermission, hasAudioPermission, isGracePeriod]);

  // Format remaining seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleHangup = () => {
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.back();
          }
        }
      ]
    );
  };

  // Detect when user clicks hangup inside Jitsi UI (redirects to Jitsi close page)
  const handleNavigationStateChange = (navState: any) => {
    if (
      navState.url.includes('close3.html') || 
      navState.url.includes('close2.html') || 
      navState.url.includes('static/close')
    ) {
      if (timerRef.current) clearInterval(timerRef.current);
      Alert.alert('Call Ended', 'The video consultation has finished.');
      router.back();
    }
  };

  // Permission Gate Screen
  if (hasCameraPermission === null || hasAudioPermission === null) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-slate-400 text-xs mt-3">Initializing calling environment...</Text>
      </View>
    );
  }

  if (!hasCameraPermission || !hasAudioPermission) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center px-6">
        <AlertCircle size={48} color="#ef4444" />
        <Text className="text-white font-extrabold text-lg mt-4 text-center">Permissions Required</Text>
        <Text className="text-slate-400 text-sm mt-2 text-center leading-relaxed">
          Haappy-Connect requires camera and microphone permissions to conduct in-app live consultations. Please enable them in your device settings.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(cameraStatus.granted);
            const audioStatus = await requestRecordingPermissionsAsync();
            setHasAudioPermission(audioStatus.granted);
          }}
          className="mt-6 bg-primary-500 py-3.5 px-8 rounded-2xl"
        >
          <Text className="text-white font-bold text-sm">Retry Granting Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Inject username and optimize mobile Jitsi experience using URL parameters
  const userDisplayName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const optimizedJitsiUrl = `${meetingLink}` +
    `#config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&userInfo.displayName="${encodeURIComponent(userDisplayName)}"`;

  // Warning color shift (red text below 5 minutes)
  const isTimeRunningOut = timeLeft < 300 || isGracePeriod;

  return (
    <View className="flex-1 bg-slate-950">
      {/* Immersive Calling WebView */}
      <WebView
        source={{ uri: optimizedJitsiUrl }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        className="flex-1"
        style={{ marginTop: Platform.OS === 'ios' ? 44 : 0 }}
      />

      {/* Floating Controls Overlay (Top Header) */}
      <View 
        className="absolute top-12 left-4 right-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex-row items-center justify-between shadow-2xl"
        style={{ zIndex: 100 }}
      >
        <View className="flex-1 mr-4">
          <Text className="text-white font-extrabold text-sm" numberOfLines={1}>
            {partnerName || 'Live Consultation'}
          </Text>
          <Text className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-wide">
            {isGracePeriod ? 'Grace Period' : 'Video Session'}
          </Text>
        </View>

        {/* Timer */}
        <View className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800/80 mr-3">
          {isTimeRunningOut ? (
            <PulsingTimer text={formatTime(timeLeft)} color="#ef4444" />
          ) : (
            <Text className="font-mono font-bold text-sm text-emerald-400">
              {formatTime(timeLeft)}
            </Text>
          )}
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          onPress={handleHangup}
          className="bg-red-500 p-3.5 rounded-2xl shadow-lg shadow-red-500/30"
          activeOpacity={0.8}
        >
          <PhoneOff size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
