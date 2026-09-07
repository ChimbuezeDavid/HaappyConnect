import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Animated, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { PhoneOff, VideoOff, MicOff, AlertCircle, ExternalLink } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { requestCameraPermission, requestAudioPermission } from '@/services/permissions';

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
  const { meetingLink, durationMinutes, partnerName, bookingId, expertId, scheduledAt } = useLocalSearchParams<{
    meetingLink: string;
    durationMinutes: string;
    partnerName: string;
    bookingId: string;
    expertId: string;
    scheduledAt?: string;
  }>();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [callPhase, setCallPhase] = useState<'waiting' | 'active' | 'grace' | 'expired'>('active');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const graceAlertShownRef = useRef(false);

  const handleExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const isCurrentUserSeeker = user?.role === 'seeker';
    if (isCurrentUserSeeker && bookingId && expertId) {
      router.replace({
        pathname: '/(tabs)/bookings',
        params: { tab: 'calls', promptReview: bookingId, expertId }
      } as any);
    } else if (bookingId) {
      router.replace({
        pathname: '/(tabs)/bookings',
        params: { tab: 'calls', promptComplete: bookingId }
      } as any);
    } else {
      router.back();
    }
  };

  // Request camera and microphone permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'web') {
        setHasCameraPermission(true);
        setHasAudioPermission(true);
        return;
      }
      const cameraGranted = await requestCameraPermission();
      setHasCameraPermission(cameraGranted);
      const audioGranted = await requestAudioPermission();
      setHasAudioPermission(audioGranted);
    };

    requestPermissions();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Synchronized UTC Timer based on scheduled appointment window
  useEffect(() => {
    if (!hasCameraPermission || !hasAudioPermission) return;

    const durationMins = parseInt(durationMinutes || '30', 10) || 30;
    const durationMs = durationMins * 60 * 1000;
    const startTimeMs = scheduledAt ? new Date(scheduledAt).getTime() : Date.now();
    const endTimeMs = startTimeMs + durationMs;

    const updateClock = () => {
      const now = Date.now();
      if (now < startTimeMs) {
        // Pre-call waiting window
        const remainingUntilStart = Math.ceil((startTimeMs - now) / 1000);
        setCallPhase('waiting');
        setTimeLeft(remainingUntilStart);
      } else if (now >= startTimeMs && now < endTimeMs) {
        // Active call window - strictly derived from endTimeMs - now
        // Both seeker and expert see identical second-for-second time!
        const remainingInCall = Math.max(0, Math.floor((endTimeMs - now) / 1000));
        setCallPhase('active');
        setTimeLeft(remainingInCall);
      } else if (now >= endTimeMs && now < endTimeMs + 60 * 1000) {
        // 60-second grace period
        const remainingGrace = Math.max(0, Math.floor((endTimeMs + 60 * 1000 - now) / 1000));
        setCallPhase('grace');
        setTimeLeft(remainingGrace);
        if (!graceAlertShownRef.current) {
          graceAlertShownRef.current = true;
          Alert.alert(
            'Time Limit Reached',
            'Your booked consultation duration has ended. The call will automatically terminate in 60 seconds.'
          );
        }
      } else {
        // Window expired
        setCallPhase('expired');
        setTimeLeft(0);
        if (timerRef.current) clearInterval(timerRef.current);
        Alert.alert('Consultation Ended', 'The scheduled consultation time limit was reached.');
        handleExit();
      }
    };

    updateClock();
    timerRef.current = setInterval(updateClock, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasCameraPermission, hasAudioPermission, scheduledAt, durationMinutes]);

  // Format seconds into MM:SS
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
            handleExit();
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
      handleExit();
    }
  };

  // Permission Gate Screen
  if (hasCameraPermission === null || hasAudioPermission === null) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs mt-3">Initializing consultation calling environment...</Text>
      </View>
    );
  }

  if (!hasCameraPermission || !hasAudioPermission) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center px-6">
        <AlertCircle size={48} color="#ef4444" />
        <Text className="text-white font-extrabold text-lg mt-4 text-center">Permissions Required</Text>
        <Text className="text-slate-400 text-sm mt-2 text-center leading-relaxed">
          HaappyConnect requires camera and microphone permissions to conduct in-app live consultations.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            const cameraGranted = await requestCameraPermission();
            setHasCameraPermission(cameraGranted);
            const audioGranted = await requestAudioPermission();
            setHasAudioPermission(audioGranted);
          }}
          className="mt-6 bg-primary-500 py-3.5 px-8 rounded-2xl"
        >
          <Text className="text-white font-bold text-sm">Grant Camera & Mic Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Inject username and optimize mobile Jitsi experience using URL parameters
  // Ensure we use fairmeeting.net (open public Jitsi domain requiring zero 8x8 login)
  let cleanMeetingLink = (meetingLink || '').trim();
  if (cleanMeetingLink.includes('meet.jit.si')) {
    cleanMeetingLink = cleanMeetingLink.replace('meet.jit.si', 'fairmeeting.net');
  }

  const userDisplayName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const optimizedJitsiUrl = `${cleanMeetingLink}` +
    `#config.prejoinPageEnabled=false` +
    `&config.disableDeepLinking=true` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.welcomePageEnabled=false` +
    `&config.hideConferenceTimer=true` +
    `&config.hideConferenceSubject=true` +
    `&config.disableInviteFunctions=true` +
    `&config.readOnlyName=true` +
    `&config.toolbarButtons=["microphone","camera","chat","tileview","select-background","videobackgroundblur"]` +
    `&userInfo.displayName="${encodeURIComponent(userDisplayName)}"`;

  // Warning color shift (red text below 5 minutes or in grace period)
  const isTimeRunningOut = (callPhase === 'active' && timeLeft < 300) || callPhase === 'grace';

  return (
    <View className="flex-1 bg-slate-955">
      {/* Immersive Calling WebView or Iframe */}
      {Platform.OS === 'web' ? (
        <iframe
          src={optimizedJitsiUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        />
      ) : (
        <WebView
          source={{ uri: optimizedJitsiUrl }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          onPermissionRequest={(event: any) => {
            const { request } = event.nativeEvent;
            request.grant(request.resources);
          }}
          className="flex-1"
          style={{ marginTop: Platform.OS === 'ios' ? 44 : 0 }}
        />
      )}

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
            {callPhase === 'waiting'
              ? 'Waiting Room'
              : callPhase === 'grace'
              ? 'Grace Period'
              : 'Video Session'}
          </Text>
        </View>

        {/* Timer */}
        <View className="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800/80 mr-3">
          {callPhase === 'waiting' ? (
            <Text className="font-mono font-bold text-xs text-amber-400">
              Starts in {formatTime(timeLeft)}
            </Text>
          ) : isTimeRunningOut ? (
            <PulsingTimer text={formatTime(timeLeft)} color="#ef4444" />
          ) : (
            <Text className="font-mono font-bold text-sm text-emerald-400">
              {formatTime(timeLeft)}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              if (cleanMeetingLink) {
                Linking.openURL(cleanMeetingLink).catch(() => {
                  Alert.alert('Error', 'Could not open external browser.');
                });
              }
            }}
            className="bg-slate-800 p-3.5 rounded-2xl mr-2.5 border border-slate-700"
            activeOpacity={0.8}
          >
            <ExternalLink size={16} color="#38bdf8" />
          </TouchableOpacity>

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
    </View>
  );
}
