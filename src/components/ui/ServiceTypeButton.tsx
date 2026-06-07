import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'nativewind';

interface ServiceTypeButtonProps {
  label: string;
  icon: React.ReactNode;
  price: string;
  selected: boolean;
  onPress: () => void;
}

export default function ServiceTypeButton({ label, icon, price, selected, onPress }: ServiceTypeButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-between p-4 rounded-2xl border ${
        selected
          ? 'bg-primary-500/10 border-primary-500 shadow-md shadow-primary-500/20'
          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
      }`}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <View
          className={`p-2 rounded-xl mr-3 ${
            selected ? 'bg-primary-500/20' : 'bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800'
          }`}
        >
          {icon}
        </View>
        <Text
          className={`font-semibold text-sm ${
            selected 
              ? 'text-slate-900 dark:text-white' 
              : 'text-slate-500 dark:text-slate-400'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-sm">{price}</Text>
    </TouchableOpacity>
  );
}
