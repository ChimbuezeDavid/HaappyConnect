import { View, Text, TouchableOpacity } from 'react-native';

interface PricingTierCardProps {
  title: string;
  price: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  onPress: () => void;
}

export default function PricingTierCard({
  title,
  price,
  description,
  icon,
  actionLabel,
  onPress,
}: PricingTierCardProps) {
  return (
    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-4 shadow-sm dark:shadow-xl">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl mr-3">
            {icon}
          </View>
          <View className="flex-1">
            <Text className="text-slate-900 dark:text-white font-bold text-base">{title}</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed" numberOfLines={2}>
              {description}
            </Text>
          </View>
        </View>

        <Text className="text-primary-600 dark:text-primary-400 font-extrabold text-lg">₦{price}</Text>
      </View>

      <TouchableOpacity
        onPress={onPress}
        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-3 rounded-2xl items-center mt-2"
      >
        <Text className="text-slate-700 dark:text-white font-bold text-sm">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
