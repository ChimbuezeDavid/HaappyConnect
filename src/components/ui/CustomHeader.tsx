import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
}

export default function CustomHeader({ title, showBackButton = false, rightElement }: CustomHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-row items-center justify-between px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80">
      <View className="flex-row items-center flex-1">
        {showBackButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-2.5 rounded-2xl"
          >
            <ArrowLeft size={18} color={isDark ? '#fff' : '#0f172a'} />
          </TouchableOpacity>
        )}
        <Text className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightElement && (
        <View className="flex-row items-center">
          {rightElement}
        </View>
      )}
    </View>
  );
}
