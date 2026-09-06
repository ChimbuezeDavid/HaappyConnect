import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

export interface AppScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Whether the screen content should scroll (default: true) */
  scrollable?: boolean;
  /** Safe area edges to pad: 'top' | 'bottom' | 'both' | 'none' (default: 'both') */
  safeAreaEdges?: 'top' | 'bottom' | 'both' | 'none';
  /** Optional refresh callback for pull-to-refresh */
  onRefresh?: () => Promise<void> | void;
  /** Refreshing boolean state */
  refreshing?: boolean;
  /** Sticky header component that sits at the top of the screen */
  header?: React.ReactNode;
  /** Fixed bottom action bar (thumb-zone anchored) */
  bottomAction?: React.ReactNode;
  /** Custom style for the outer container */
  containerStyle?: ViewStyle;
  /** Custom style for the inner content container */
  contentContainerStyle?: ViewStyle;
  /** Extra keyboard vertical offset */
  keyboardOffset?: number;
}

/**
 * AppScreen: Standardized Human-Centered Design (HCI) screen container.
 * 
 * Enforces:
 * - Content-aware keyboard avoiding & scroll restoration
 * - Thumb-zone ergonomics with safe-area anchoring
 * - Consistent Light (Warm Alabaster #FAF8F5) and Dark (Obsidian #0B0F14) backgrounds
 * - Seamless Pull-to-Refresh with brand emerald tinting
 */
export const AppScreen: React.FC<AppScreenProps> = ({
  children,
  scrollable = true,
  safeAreaEdges = 'both',
  onRefresh,
  refreshing = false,
  header,
  bottomAction,
  containerStyle,
  contentContainerStyle,
  keyboardOffset = 0,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const paddingTop =
    safeAreaEdges === 'top' || safeAreaEdges === 'both' ? insets.top : 0;
  const paddingBottom =
    safeAreaEdges === 'bottom' || safeAreaEdges === 'both' ? insets.bottom : 0;

  const backgroundColor = isDark ? '#0B0F14' : '#FAF8F5';
  const refreshColor = isDark ? '#10B981' : '#059669';

  return (
    <View style={[styles.root, { backgroundColor }, containerStyle]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />

      {/* Header Slot (Safe Top Aware) */}
      {header && (
        <View
          style={[
            styles.headerWrapper,
            {
              paddingTop,
              backgroundColor: isDark ? '#131A22' : '#FAF8F5',
              borderBottomColor: isDark ? '#222D3D' : '#E7E1D8',
            },
          ]}
        >
          {header}
        </View>
      )}

      {/* Keyboard-Aware Content View */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 0}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: header ? 8 : paddingTop + 8,
                paddingBottom: bottomAction ? 16 : paddingBottom + 16,
              },
              contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={refreshColor}
                  colors={[refreshColor]}
                />
              ) : undefined
            }
            {...scrollViewProps}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.flex,
              {
                paddingTop: header ? 8 : paddingTop + 8,
                paddingBottom: bottomAction ? 16 : paddingBottom + 16,
              },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        )}

        {/* Thumb-Zone Anchored Bottom Action Bar */}
        {bottomAction && (
          <View
            style={[
              styles.bottomActionWrapper,
              {
                paddingBottom: Math.max(paddingBottom, 16),
                backgroundColor: isDark ? '#131A22' : '#FAF8F5',
                borderTopColor: isDark ? '#222D3D' : '#E7E1D8',
              },
            ]}
          >
            {bottomAction}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomActionWrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});

export default AppScreen;
