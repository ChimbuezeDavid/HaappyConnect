import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ShieldCheck,
  ChevronLeft,
  UploadCloud,
  FileCheck,
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  Briefcase,
  HelpCircle,
  Check,
  Eye,
  EyeOff,
  Lock,
  Sliders,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface CertificationItem {
  title: string;
  issuer: string;
  year: string;
  proofUrl?: string;
}

export default function ExpertVerificationScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, loadUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('unsubmitted');
  const [isVerified, setIsVerified] = useState(false);

  // Form fields
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [mentorshipStatement, setMentorshipStatement] = useState('');
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

  // Public visibility toggles (what seekers can see)
  const [showCertifications, setShowCertifications] = useState(true);
  const [showExperience, setShowExperience] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showMentorshipStatement, setShowMentorshipStatement] = useState(true);

  // Temp cert modal/inputs
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certYear, setCertYear] = useState('');
  const [showAddCert, setShowAddCert] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.get('/expert/verification/status');
      setIsVerified(data.isVerified);
      setVerificationStatus(data.verificationStatus || 'unsubmitted');
      if (data.verificationData) {
        setIdDocumentUrl(data.verificationData.idDocumentUrl || '');
        setYearsOfExperience(data.verificationData.yearsOfExperience ? String(data.verificationData.yearsOfExperience) : '');
        setPortfolioUrl(data.verificationData.portfolioUrl || '');
        setMentorshipStatement(data.verificationData.mentorshipStatement || '');
        setCertifications(data.verificationData.certifications || []);
      }
      if (data.publicAccreditation) {
        setShowCertifications(data.publicAccreditation.showCertifications !== false);
        setShowExperience(data.publicAccreditation.showExperience !== false);
        setShowPortfolio(data.publicAccreditation.showPortfolio !== false);
        setShowMentorshipStatement(data.publicAccreditation.showMentorshipStatement !== false);
      }
    } catch (err: any) {
      console.warn('Failed to fetch verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCert = () => {
    if (!certTitle.trim() || !certIssuer.trim()) {
      Alert.alert('Validation Error', 'Please enter certification title and issuing organization.');
      return;
    }
    setCertifications([
      ...certifications,
      {
        title: certTitle.trim(),
        issuer: certIssuer.trim(),
        year: certYear.trim() || new Date().getFullYear().toString(),
      },
    ]);
    setCertTitle('');
    setCertIssuer('');
    setCertYear('');
    setShowAddCert(false);
  };

  const handleRemoveCert = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!yearsOfExperience.trim() || !mentorshipStatement.trim()) {
      Alert.alert('Validation Error', 'Please specify years of active experience and your mentorship background statement.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/expert/verification/submit', {
        idDocumentUrl,
        certifications,
        yearsOfExperience: Number(yearsOfExperience) || 0,
        portfolioUrl,
        mentorshipStatement,
        publicAccreditation: {
          showCertifications,
          showExperience,
          showPortfolio,
          showMentorshipStatement,
        },
      });

      setVerificationStatus('pending');
      await loadUser();
      Alert.alert(
        'Application Submitted',
        'Your accreditation details and cross-examination questions have been forwarded to the Executive Admin Board for review.',
        [{ text: 'Great', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs mt-3">Loading accreditation profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isDark ? '#0B0F14' : '#FAF8F5' }}
    >
      <View className="flex-1 max-w-2xl w-full self-center">
        {/* Header */}
        <View className="px-6 pt-12 pb-4 flex-row items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3"
            >
              <ChevronLeft size={20} color={isDark ? '#FFF' : '#0F172A'} />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-black text-slate-900 dark:text-white">
                Expert Accreditation
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Cross-examination & Verification Portal
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          {isVerified ? (
            <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
              <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase">Verified</Text>
            </View>
          ) : verificationStatus === 'pending' ? (
            <View className="flex-row items-center bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
              <Clock size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text className="text-amber-700 dark:text-amber-400 text-xs font-black uppercase">Pending</Text>
            </View>
          ) : verificationStatus === 'rejected' ? (
            <View className="flex-row items-center bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-full">
              <AlertCircle size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text className="text-red-700 dark:text-red-400 text-xs font-black uppercase">Rejected</Text>
            </View>
          ) : (
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
              <ShieldCheck size={14} color="#64748B" style={{ marginRight: 4 }} />
              <Text className="text-slate-600 dark:text-slate-400 text-xs font-black uppercase">Unsubmitted</Text>
            </View>
          )}
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Banner */}
          {isVerified ? (
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 mb-6">
              <View className="flex-row items-center mb-1">
                <CheckCircle2 size={20} color="#059669" style={{ marginRight: 8 }} />
                <Text className="text-emerald-800 dark:text-emerald-300 font-black text-base">
                  Account Officially Accredited
                </Text>
              </View>
              <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Your credentials and identity documents have been reviewed and approved. Your profile displays the Gold Verified Expert badge to seekers.
              </Text>
            </View>
          ) : verificationStatus === 'pending' ? (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 mb-6">
              <View className="flex-row items-center mb-1">
                <Clock size={20} color="#D97706" style={{ marginRight: 8 }} />
                <Text className="text-amber-800 dark:text-amber-300 font-black text-base">
                  Application Under Review
                </Text>
              </View>
              <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Our verification team is cross-examining your submitted credentials. You will be notified once reviewed. You may update your submission below at any time.
              </Text>
            </View>
          ) : null}

          {/* 1. Cross-Examination Questions */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              1. Professional Cross-Examination
            </Text>

            {/* Years of Experience */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Years of Active Industry Experience *
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                  borderColor: isDark ? '#222D3D' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl px-4 py-3 border"
              >
                <Briefcase size={18} color="#059669" style={{ marginRight: 10 }} />
                <TextInput
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  placeholder="e.g. 8"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  keyboardType="number-pad"
                  className="flex-1 text-sm text-slate-900 dark:text-white font-semibold"
                />
              </View>
            </View>

            {/* Portfolio / LinkedIn Link */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Professional Portfolio, GitHub, or LinkedIn URL
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                  borderColor: isDark ? '#222D3D' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl px-4 py-3 border"
              >
                <LinkIcon size={18} color="#059669" style={{ marginRight: 10 }} />
                <TextInput
                  value={portfolioUrl}
                  onChangeText={setPortfolioUrl}
                  placeholder="https://linkedin.com/in/username"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  autoCapitalize="none"
                  className="flex-1 text-sm text-slate-900 dark:text-white"
                />
              </View>
            </View>

            {/* Mentorship Track Record */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mentorship Background & Value Proposition *
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                  borderColor: isDark ? '#222D3D' : '#E2E8F0',
                }}
                className="rounded-2xl px-4 py-3 border"
              >
                <TextInput
                  value={mentorshipStatement}
                  onChangeText={setMentorshipStatement}
                  placeholder="Describe your advisory experience, notable clients/projects you guided, and why you are qualified to mentor on HaappyConnect..."
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 90, textAlignVertical: 'top' }}
                  className="text-sm text-slate-900 dark:text-white leading-relaxed"
                />
              </View>
            </View>
          </View>

          {/* 2. Professional Certifications & Licenses */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Licenses & Certifications ({certifications.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddCert(true)}
                className="flex-row items-center bg-primary-500/10 px-3 py-1.5 rounded-full"
              >
                <Plus size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text className="text-primary-600 dark:text-primary-400 font-bold text-xs">Add Cert</Text>
              </TouchableOpacity>
            </View>

            {/* Certifications List */}
            {certifications.length === 0 ? (
              <View
                style={{
                  backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                  borderColor: isDark ? '#222D3D' : '#E2E8F0',
                }}
                className="rounded-2xl p-6 items-center border border-dashed"
              >
                <Award size={32} color={isDark ? '#334155' : '#CBD5E1'} style={{ marginBottom: 8 }} />
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No Certifications Listed Yet
                </Text>
                <Text className="text-xs text-slate-400 text-center mt-1">
                  Add recognized professional licenses, academic degrees, or certifications to boost credibility.
                </Text>
              </View>
            ) : (
              certifications.map((cert, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                    borderColor: isDark ? '#222D3D' : '#E2E8F0',
                  }}
                  className="rounded-2xl p-4 mb-2.5 flex-row justify-between items-center border"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-9 h-9 rounded-xl bg-primary-500/10 items-center justify-center mr-3">
                      <FileCheck size={18} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                        {cert.title}
                      </Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {cert.issuer} • {cert.year}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveCert(index)} className="p-2">
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add Cert Inline Form Modal */}
            {showAddCert && (
              <View
                style={{
                  backgroundColor: isDark ? '#18222E' : '#FFFFFF',
                  borderColor: '#059669',
                }}
                className="rounded-2xl p-4 mt-3 border-2"
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2">
                  Add Professional Certification
                </Text>
                <TextInput
                  value={certTitle}
                  onChangeText={setCertTitle}
                  placeholder="Certification Name (e.g. AWS Solutions Architect)"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  className="text-sm text-slate-900 dark:text-white py-2 border-b border-slate-200 dark:border-slate-800 mb-2"
                />
                <TextInput
                  value={certIssuer}
                  onChangeText={setCertIssuer}
                  placeholder="Issuing Authority (e.g. Amazon Web Services / ACCA)"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  className="text-sm text-slate-900 dark:text-white py-2 border-b border-slate-200 dark:border-slate-800 mb-2"
                />
                <TextInput
                  value={certYear}
                  onChangeText={setCertYear}
                  placeholder="Year Issued (e.g. 2023)"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  keyboardType="number-pad"
                  className="text-sm text-slate-900 dark:text-white py-2 mb-3"
                />
                <View className="flex-row justify-end gap-2">
                  <TouchableOpacity
                    onPress={() => setShowAddCert(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                  >
                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddCert}
                    className="px-4 py-2 rounded-xl bg-primary-500"
                  >
                    <Text className="text-xs font-bold text-white">Add Certificate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* 3. Identity Document URL / File */}
          <View className="mb-8">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              3. Government ID / Accreditation Link
            </Text>
            <View
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
              }}
              className="flex-row items-center rounded-2xl px-4 py-3 border"
            >
              <UploadCloud size={18} color="#059669" style={{ marginRight: 10 }} />
              <TextInput
                value={idDocumentUrl}
                onChangeText={setIdDocumentUrl}
                placeholder="Cloud document link (Google Drive, Dropbox, or secure hosted PDF)..."
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                autoCapitalize="none"
                className="flex-1 text-sm text-slate-900 dark:text-white"
              />
            </View>
            <Text className="text-slate-400 text-[11px] mt-1.5 ml-1">
              Documents are encrypted and exclusively reviewed by vetted administrators.
            </Text>
          </View>

          {/* 4. Seeker Profile Visibility Controls */}
          <View className="mb-8">
            <View className="flex-row items-center mb-1">
              <Sliders size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                4. Public Profile Visibility Controls
              </Text>
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs mb-4">
              Select which verified credentials and cross-examination answers are displayed to seekers on your public profile:
            </Text>

            {/* Certifications Toggle */}
            <TouchableOpacity
              onPress={() => setShowCertifications(!showCertifications)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
              }}
              className="rounded-2xl p-4 mb-2.5 flex-row justify-between items-center border"
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  Show Licenses & Certifications
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Displays your verified credentials and issuing authorities to seekers.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: showCertifications ? '#059669' : (isDark ? '#334155' : '#CBD5E1'),
                }}
                className="w-12 h-7 rounded-full justify-center px-1"
              >
                <View
                  style={{
                    transform: [{ translateX: showCertifications ? 20 : 0 }],
                  }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                />
              </View>
            </TouchableOpacity>

            {/* Experience Toggle */}
            <TouchableOpacity
              onPress={() => setShowExperience(!showExperience)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
              }}
              className="rounded-2xl p-4 mb-2.5 flex-row justify-between items-center border"
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  Show Years of Industry Experience
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Displays your total years of active career experience on your profile.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: showExperience ? '#059669' : (isDark ? '#334155' : '#CBD5E1'),
                }}
                className="w-12 h-7 rounded-full justify-center px-1"
              >
                <View
                  style={{
                    transform: [{ translateX: showExperience ? 20 : 0 }],
                  }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                />
              </View>
            </TouchableOpacity>

            {/* Portfolio Link Toggle */}
            <TouchableOpacity
              onPress={() => setShowPortfolio(!showPortfolio)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
              }}
              className="rounded-2xl p-4 mb-2.5 flex-row justify-between items-center border"
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  Show Portfolio / LinkedIn Link
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Allows seekers to inspect your public portfolio or professional profile.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: showPortfolio ? '#059669' : (isDark ? '#334155' : '#CBD5E1'),
                }}
                className="w-12 h-7 rounded-full justify-center px-1"
              >
                <View
                  style={{
                    transform: [{ translateX: showPortfolio ? 20 : 0 }],
                  }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                />
              </View>
            </TouchableOpacity>

            {/* Mentorship Statement Toggle */}
            <TouchableOpacity
              onPress={() => setShowMentorshipStatement(!showMentorshipStatement)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? '#131A22' : '#FFFFFF',
                borderColor: isDark ? '#222D3D' : '#E2E8F0',
              }}
              className="rounded-2xl p-4 mb-2.5 flex-row justify-between items-center border"
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  Show Mentorship Background Statement
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Displays your advisory expertise and track record to prospective seekers.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: showMentorshipStatement ? '#059669' : (isDark ? '#334155' : '#CBD5E1'),
                }}
                className="w-12 h-7 rounded-full justify-center px-1"
              >
                <View
                  style={{
                    transform: [{ translateX: showMentorshipStatement ? 20 : 0 }],
                  }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                />
              </View>
            </TouchableOpacity>

            {/* Government ID Privacy Guarantee Badge */}
            <View className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-3.5 flex-row items-center mt-2">
              <Lock size={16} color="#059669" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900 dark:text-white">
                  Government ID & Legal Documents
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                  Strictly Private to the Executive Admin Board for compliance and identity verification. Never accessible to seekers.
                </Text>
              </View>
            </View>
          </View>

          {/* Submit CTA */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{ backgroundColor: '#059669' }}
            className="w-full py-4 rounded-2xl flex-row justify-center items-center active:bg-primary-600 shadow-lg"
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <ShieldCheck size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-base">
                  {verificationStatus === 'pending'
                    ? 'Update Verification Details'
                    : 'Submit for Admin Verification'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
