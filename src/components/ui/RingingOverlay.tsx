import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/store/chatStore';
import { Phone, PhoneOff, Video } from 'lucide-react-native';

export default function RingingOverlay() {
  const router = useRouter();
  const { activeCall, acceptCallInvite, declineCallInvite, cancelCallInvite, clearActiveCall } = useChatStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for the ring overlay buttons/avatars
  useEffect(() => {
    if (activeCall) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activeCall]);

  // Navigate when call becomes connected
  useEffect(() => {
    if (activeCall?.status === 'connected') {
      console.log('[RingingOverlay] Call connected. Navigating to call screen...');
      router.push({
        pathname: '/bookings/call' as any,
        params: {
          meetingLink: activeCall.meetingLink || '',
          durationMinutes: activeCall.durationMinutes || '30',
          partnerName: activeCall.partnerName || 'Consultation Session',
          bookingId: activeCall.bookingId,
          expertId: activeCall.partnerId,
        },
      });
      clearActiveCall();
    }
  }, [activeCall?.status]);

  if (!activeCall || activeCall.status === 'connected') {
    return null;
  }

  const isIncoming = activeCall.status === 'incoming';

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.container}>
        <View style={styles.content}>
          
          {/* Animated Pulsing Icon Ring */}
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.avatarCircle, isIncoming ? styles.incomingBorder : styles.outgoingBorder]}>
              <Video size={42} color="#fff" />
            </View>
          </Animated.View>

          {/* Partner Name & Subtitle */}
          <Text style={styles.partnerName}>{activeCall.partnerName}</Text>
          <Text style={styles.statusText}>
            {isIncoming ? 'Incoming video call...' : 'Calling expert...'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isIncoming ? (
              <>
                {/* Decline Button */}
                <TouchableOpacity
                  onPress={declineCallInvite}
                  style={[styles.actionBtn, styles.declineBtn]}
                  activeOpacity={0.8}
                >
                  <PhoneOff size={24} color="#fff" />
                  <Text style={styles.btnLabel}>Decline</Text>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  onPress={acceptCallInvite}
                  style={[styles.actionBtn, styles.acceptBtn]}
                  activeOpacity={0.8}
                >
                  <Phone size={24} color="#fff" />
                  <Text style={styles.btnLabel}>Accept</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Cancel Button */
              <TouchableOpacity
                onPress={cancelCallInvite}
                style={[styles.actionBtn, styles.declineBtn, styles.cancelBtnSingle]}
                activeOpacity={0.8}
              >
                <PhoneOff size={24} color="#fff" />
                <Text style={styles.btnLabel}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  pulseRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  incomingBorder: {
    borderColor: '#10b981',
  },
  outgoingBorder: {
    borderColor: '#6366f1',
  },
  partnerName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statusText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 60,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  actionBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  declineBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  cancelBtnSingle: {
    alignSelf: 'center',
  },
  btnLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
    position: 'absolute',
    bottom: -22,
  },
});
