import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        {/* Backdrop */}
        <View className="flex-1 bg-slate-950/80 justify-end">
          <TouchableWithoutFeedback>
            {/* Sheet Content Container */}
            <View className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-6 pb-12 shadow-2xl">
              {/* Drag indicator handle decoration */}
              <View className="w-12 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full self-center mb-6" />

              {/* Title & Close Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 p-2 rounded-full"
                >
                  <X size={16} color={isDark ? '#fff' : '#0f172a'} />
                </TouchableOpacity>
              </View>

              {/* Dynamic Child Elements */}
              <View>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
