/* eslint-disable react-hooks/set-state-in-effect */
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

  const [bounceAnim] = useState(() => new Animated.Value(1));

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

  const QUICK_TAGS = [
    'Actionable Advice',
    'Clear & Thorough',
    'Punctual & Friendly',
    'Great Value',
    'Inspiring Mentorship',
  ];

  const handleTagToggle = (tag: string) => {
    if (comment.includes(tag)) {
      setComment(comment.replace(tag, '').replace(/,\s*,/g, ',').trim());
    } else {
      const separator = comment.trim().length > 0 ? ', ' : '';
      setComment((prev) => `${prev.trim()}${separator}${tag}`);
    }
  };

  const getRatingSentiment = () => {
    switch (rating) {
      case 5:
        return { text: 'Outstanding & Transformative', emoji: '🌟', color: '#059669' };
      case 4:
        return { text: 'Very Good & Valuable', emoji: '😊', color: '#10B981' };
      case 3:
        return { text: 'Good & Met Expectations', emoji: '🙂', color: '#EAB308' };
      case 2:
        return { text: 'Fair - Needs Improvement', emoji: '😐', color: '#D97706' };
      default:
        return { text: 'Poor Experience', emoji: '😞', color: '#EF4444' };
    }
  };

  const sentiment = getRatingSentiment();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <View 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <Pressable 
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} 
            onPress={onClose} 
          />
          
          <View 
            style={{ width: '100%', maxWidth: 440 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-1 mr-3">
                <Text className="text-xl font-black text-slate-900 dark:text-white">
                  Leave a Review
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rate your consultation session with this mentor
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                activeOpacity={0.7}
              >
                <X size={18} color={isDark ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Star Rating Section */}
              <View className="items-center py-2 mb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Overall Rating
                </Text>
                
                {/* Horizontal Star Row (Guaranteed inline horizontal alignment) */}
                <Animated.View 
                  style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    transform: [{ scale: bounceAnim }] 
                  }}
                >
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <TouchableOpacity
                      key={starVal}
                      onPress={() => handleRatingSelect(starVal)}
                      style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                      activeOpacity={0.7}
                    >
                      <Star 
                        size={36} 
                        color={starVal <= rating ? '#f59e0b' : (isDark ? '#334155' : '#cbd5e1')} 
                        fill={starVal <= rating ? '#f59e0b' : 'transparent'} 
                      />
                    </TouchableOpacity>
                  ))}
                </Animated.View>

                {/* Dynamic Sentiment Feedback Badge */}
                <View 
                  style={{ backgroundColor: `${sentiment.color}15`, borderColor: `${sentiment.color}35` }}
                  className="mt-3.5 px-3 py-1 rounded-full border flex-row items-center"
                >
                  <Text style={{ marginRight: 6 }}>{sentiment.emoji}</Text>
                  <Text 
                    style={{ color: sentiment.color }}
                    className="text-xs font-black uppercase tracking-wider"
                  >
                    {sentiment.text}
                  </Text>
                </View>
              </View>

              {/* Quick Feedback Tags */}
              <View className="mb-4">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Highlight Highlights (Tap to add)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = comment.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => handleTagToggle(tag)}
                        activeOpacity={0.7}
                        className={`px-3 py-1.5 rounded-xl border ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Feedback Comment Input */}
              <View className="mb-5">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Comment (Optional)
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    {comment.length} / 500
                  </Text>
                </View>
                <TextInput
                  placeholder="Share details about the value you gained..."
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={comment}
                  onChangeText={(text) => text.length <= 500 && setComment(text)}
                  multiline={true}
                  numberOfLines={3}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-slate-900 dark:text-white text-sm min-h-[90px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 py-3.5 rounded-2xl flex-row justify-center items-center ${
                    isSubmitting ? 'bg-primary-600/70' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
