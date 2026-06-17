import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { X, Star } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { api } from '@/lib/api';

interface SubmitReviewModalProps {
  visible: boolean;
  onClose: () => void;
  expertId: string;
  bookingId?: string;
  questionId?: string;
  onSuccess: () => void;
}

export default function SubmitReviewModal({ visible, onClose, expertId, bookingId, questionId, onSuccess }: SubmitReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setRating(5);
      setComment('');
      bounceAnim.setValue(1);
    }
  }, [visible]);

  const handleRatingSelect = (starVal: number) => {
    setRating(starVal);
    bounceAnim.setValue(0.8);
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver: true
    }).start();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/review', {
        expertId,
        rating,
        comment: comment.trim(),
        bookingId,
        questionId
      });
      
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Server error submitting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={onClose} />
          
          <View className="bg-white dark:bg-slate-900 rounded-t-[36px] p-6 pb-10 border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text className="text-xl font-extrabold text-slate-900 dark:text-white">Leave a Review</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rate your consultation session</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                  <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Star Rating Selectors */}
              <Text className="text-xs font-semibold text-slate-655 dark:text-slate-400 uppercase tracking-wider text-center mb-3">Overall Rating</Text>
              
              <Animated.View 
                style={{ transform: [{ scale: bounceAnim }] }}
                className="flex-row justify-center gap-3 mb-6"
              >
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <TouchableOpacity
                    key={starVal}
                    onPress={() => handleRatingSelect(starVal)}
                    className="p-1"
                    activeOpacity={0.6}
                  >
                    <Star 
                      size={36} 
                      color={starVal <= rating ? '#f59e0b' : (isDark ? '#334155' : '#cbd5e1')} 
                      fill={starVal <= rating ? '#f59e0b' : 'transparent'} 
                    />
                  </TouchableOpacity>
                ))}
              </Animated.View>

              {/* Rating Text description */}
              <Text className="text-center font-extrabold text-slate-850 dark:text-slate-250 text-sm mb-6 uppercase tracking-wider">
                {rating === 5 && '🏆 Excellent'}
                {rating === 4 && '✨ Good'}
                {rating === 3 && '👍 Average'}
                {rating === 2 && '👎 Poor'}
                {rating === 1 && '⚠️ Terrible'}
              </Text>

              {/* Feedback Comment Input */}
              <Text className="text-xs font-semibold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-2">Comment (Optional)</Text>
              <TextInput
                placeholder="Share your experience working with this expert..."
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                value={comment}
                onChangeText={setComment}
                multiline={true}
                numberOfLines={4}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white text-sm mb-6 min-h-[100px]"
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4.5 rounded-2xl flex-row justify-center items-center ${
                  isSubmitting ? 'bg-primary-500/80' : 'bg-primary-500'
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-extrabold text-base">Submit Review</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
