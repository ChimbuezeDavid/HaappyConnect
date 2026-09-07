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
        <View className="flex-1 bg-slate-950/80 justify-center items-center px-4">
          <TouchableWithoutFeedback>
            {/* Dialog Content Container */}
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-2xl max-w-md w-full">
              {/* Title & Close Header */}
              <View className="flex-row items-center justify-between mb-5">
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
