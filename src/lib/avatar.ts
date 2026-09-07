/**
 * Universal Avatar Resolver for HaappyConnect
 * Ensures that avatars are always valid, non-SVG, and render reliably
 * across React Native on Android/iOS and Web browsers.
 */

import { API_URL } from './api';

export const getAvatarUrl = (avatarUrl?: string | null, fullName?: string | null): string => {
  const cleanName = (fullName || 'User').trim();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=ffffff&size=256&bold=true&format=png`;

  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return fallbackUrl;
  }

  let trimmed = avatarUrl.trim();
  if (!trimmed) {
    return fallbackUrl;
  }

  // Broken or blocked placeholder services
  if (trimmed.includes('placeholder.com') || trimmed.includes('placehold.it')) {
    return fallbackUrl;
  }

  // Handle relative uploads path: e.g. "/uploads/avatar-123.jpg" or "uploads/avatar-123.jpg"
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const serverBase = API_URL.replace(/\/api\/?$/, '');
    trimmed = `${serverBase}/${trimmed.replace(/^\//, '')}`;
  }

  // Rewrite localhost / 127.0.0.1 uploads if on mobile / remote client
  if (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:')) {
    const serverBase = API_URL.replace(/\/api\/?$/, '');
    trimmed = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, serverBase);
  }

  // React Native <Image> cannot render .svg on mobile
  if (trimmed.includes('dicebear.com')) {
    trimmed = trimmed.replace(/\/svg(\?|$)/, '/png$1').replace(/\.svg(\?|$)/, '.png$1');
  }

  // Any other SVG files cannot be decoded by native React Native Image
  if (trimmed.includes('.svg')) {
    return fallbackUrl;
  }

  // Upgrade http:// to https:// on remote domains
  if (trimmed.startsWith('http://') && !trimmed.includes('10.0.2.2')) {
    trimmed = trimmed.replace('http://', 'https://');
  }

  return trimmed;
};
