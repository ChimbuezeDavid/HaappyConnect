import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, MessageSquare, PhoneCall } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Profile } from '@/types';

interface ExpertCardProps {
  expert: Profile;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    // Navigate to full expert detail profile view
    router.push({ pathname: '/expert/[id]', params: { id: expert._id } });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-5 shadow-sm dark:shadow-xl backdrop-blur-md"
    >
      {/* Header Info */}
      <View className="flex-row items-center mb-4">
        <Image
          source={{ uri: expert.avatarUrl || 'https://via.placeholder.com/150' }}
          className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
        />
        <View className="flex-1 ml-4 pr-1">
          <Text className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{expert.fullName}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5" numberOfLines={1}>
            {expert.headline}
          </Text>
          
          <View className="flex-row items-center mt-1.5">
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">
              {expert.ratingAverage.toFixed(1)}
            </Text>
            <Text className="text-slate-500 dark:text-slate-500 text-xs ml-1">
              ({expert.reviewsCount} reviews)
            </Text>
          </View>
        </View>
      </View>

      {/* Categories Badge row */}
      {expert.categories && expert.categories.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-4">
          {expert.categories.slice(0, 2).map((cat) => (
            <View
              key={cat._id}
              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {cat.name}
              </Text>
            </View>
          ))}
          {expert.categories.length > 2 && (
            <View className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2 py-1 rounded-lg">
              <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                +{expert.categories.length - 2} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Pricing brief footer */}
      <View className="flex-row justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-1">
        <View className="flex-row items-center">
          <MessageSquare size={13} color={isDark ? '#94a3b8' : '#64748b'} />
          <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">Text Question</Text>
          <Text className="text-slate-900 dark:text-white font-extrabold text-sm ml-1.5">₦{expert.textQuestionPrice}</Text>
        </View>

        <View className="flex-row items-center">
          <PhoneCall size={13} color={isDark ? '#94a3b8' : '#64748b'} />
          <Text className="text-slate-500 dark:text-slate-400 text-xs ml-1.5">Live Call</Text>
          <Text className="text-slate-900 dark:text-white font-extrabold text-sm ml-1.5">₦{expert.hourlyRate}/hr</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
