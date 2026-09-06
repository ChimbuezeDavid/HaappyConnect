import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { usePermissionPrimerStore } from '@/services/permissions';
import { useColorScheme } from 'nativewind';
import { Bell, Camera, Mic, Image as ImageIcon, Check, Shield } from 'lucide-react-native';

export const PermissionPrimerModal: React.FC = () => {
  const { isVisible, type, title, description, benefitPoints, hidePrimer } = usePermissionPrimerStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!isVisible) return null;

  const renderIcon = () => {
    switch (type) {
      case 'notifications':
        return <Bell size={30} color={isDark ? '#34D399' : '#059669'} />;
      case 'camera':
        return <Camera size={30} color={isDark ? '#34D399' : '#059669'} />;
      case 'microphone':
        return <Mic size={30} color={isDark ? '#34D399' : '#059669'} />;
      default:
        return <ImageIcon size={30} color={isDark ? '#34D399' : '#059669'} />;
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => hidePrimer(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: isDark ? '#131A22' : '#FFFFFF',
            borderColor: isDark ? '#222D3D' : '#E7E1D8',
            borderWidth: 1,
            borderRadius: 28,
            padding: 26,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header Icon */}
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: isDark ? '#10B98120' : '#05966915',
              borderColor: isDark ? '#10B98135' : '#05966925',
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              marginBottom: 18,
            }}
          >
            {renderIcon()}
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'PlusJakartaSans_700Bold',
              color: isDark ? '#F8FAFC' : '#0F172A',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            {title}
          </Text>

          {/* Subtitle / Description */}
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              color: isDark ? '#94A3B8' : '#64748B',
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {description}
          </Text>

          {/* Benefits Check List */}
          {benefitPoints.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? '#0B0F14' : '#FAF8F5',
                borderColor: isDark ? '#222D3D' : '#E7E1D8',
                borderWidth: 1,
                borderRadius: 18,
                padding: 16,
                marginBottom: 22,
                gap: 12,
              }}
            >
              {benefitPoints.map((point, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: isDark ? '#10B98125' : '#05966920',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      marginTop: 1,
                    }}
                  >
                    <Check size={12} color={isDark ? '#34D399' : '#059669'} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontFamily: 'Inter_400Regular',
                      color: isDark ? '#E2E8F0' : '#334155',
                      lineHeight: 18,
                    }}
                  >
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Privacy Note */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Shield size={13} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_400Regular',
                color: isDark ? '#64748B' : '#94A3B8',
                marginLeft: 6,
              }}
            >
              You can modify this anytime in your phone settings.
            </Text>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={() => hidePrimer(true)}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#059669',
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 15,
              }}
            >
              Continue & Allow Access
            </Text>
          </TouchableOpacity>

          {/* Secondary Action (Not Now) */}
          <TouchableOpacity
            onPress={() => hidePrimer(false)}
            activeOpacity={0.6}
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: isDark ? '#64748B' : '#94A3B8',
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
              }}
            >
              Not Right Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PermissionPrimerModal;
