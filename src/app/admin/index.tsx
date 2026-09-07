import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ShieldAlert,
  Users,
  Calendar,
  Wallet,
  CheckCircle,
  XCircle,
  Lock,
  LogOut,
  RefreshCw,
  Award,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react-native';
import { api, API_URL } from '@/lib/api';

export default function AdminScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Account Creation & Governance State
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [allowAdminRegistration, setAllowAdminRegistration] = useState(true);
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Dashboard Data
  const [tab, setTab] = useState<'verifications' | 'users' | 'economics'>('verifications');
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Platform Economics State
  const [platformFee, setPlatformFee] = useState('20');
  const [baseCallPrice, setBaseCallPrice] = useState('500');
  const [slaDays, setSlaDays] = useState('7');
  const [savingEconomics, setSavingEconomics] = useState(false);
  const [economicsSuccess, setEconomicsSuccess] = useState<string | null>(null);
  const [economicsError, setEconomicsError] = useState<string | null>(null);

  // Helper to retrieve admin token with cookie fallback
  const getStoredAdminToken = (): string | null => {
    if (Platform.OS === 'web') {
      let token = typeof localStorage !== 'undefined' ? (localStorage.getItem('hc_admin_token') || localStorage.getItem('haappy_admin_token')) : null;
      if (!token && typeof document !== 'undefined') {
        const match = document.cookie.match(/hc_admin_token=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hc_admin_token', token);
            localStorage.setItem('haappy_admin_token', token);
          }
        }
      }
      return token;
    }
    return null;
  };

  const persistAdminToken = (token: string | null) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        if (token) {
          localStorage.setItem('hc_admin_token', token);
          localStorage.setItem('haappy_admin_token', token);
        } else {
          localStorage.removeItem('hc_admin_token');
          localStorage.removeItem('haappy_admin_token');
        }
      }
      if (typeof document !== 'undefined') {
        if (token) {
          document.cookie = `hc_admin_token=${encodeURIComponent(token)}; path=/; max-age=${180 * 24 * 60 * 60}; SameSite=Lax`;
        } else {
          document.cookie = `hc_admin_token=; path=/; max-age=0; SameSite=Lax`;
        }
      }
    }
  };

  // Check stored admin token and registration status on mount
  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) {
      setAdminToken(stored);
    }
    fetchRegistrationStatus();
  }, []);

  const safeFetchJson = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (res.status === 404) {
        throw new Error('Admin API endpoint was not found on server (404). Please ensure the backend is deployed.');
      }
      throw new Error(`Server returned unexpected response (${res.status})`);
    }
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return data;
  };

  const fetchRegistrationStatus = async () => {
    try {
      const data = await safeFetchJson(`${API_URL}/admin/registration-status`);
      const allowed = data.allowAdminRegistration !== false;
      setAllowAdminRegistration(allowed);
      if (!allowed) {
        setIsCreateMode(false);
      }
    } catch (err) {
      console.warn('Failed to fetch admin registration status:', err);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAdminData();
    }
  }, [adminToken, tab]);

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setLoginError('Email and password are required');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    setCreateSuccess(null);
    try {
      const data = await safeFetchJson(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      setAdminToken(data.token);
      persistAdminToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminCreate = async () => {
    if (!email || !password) {
      setLoginError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setLoginError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setLoginError('Passwords do not match');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    setCreateSuccess(null);
    try {
      const data = await safeFetchJson(`${API_URL}/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      setAdminToken(data.token);
      persistAdminToken(data.token);
      setCreateSuccess('Administrator account created successfully!');
    } catch (err: any) {
      setLoginError(err.message || 'Failed to create administrator account');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    persistAdminToken(null);
    fetchRegistrationStatus();
  };

  const loadAdminData = async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      // 1. Dashboard summary
      const dashRes = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (dashRes.status === 401) {
        setAdminToken(null);
        persistAdminToken(null);
        return;
      }
      if (dashRes.ok) {
        const d = await dashRes.json();
        setStats(d.summary || null);
      }

      // 2. Tab-specific data
      if (tab === 'verifications') {
        const vRes = await fetch(`${API_URL}/admin/verifications`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          setVerifications(vData);
        }
      } else if (tab === 'users') {
        const uRes = await fetch(`${API_URL}/admin/users?limit=30`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsersList(uData.users || []);
        }
      } else if (tab === 'economics') {
        const sRes = await fetch(`${API_URL}/admin/settings`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          setPlatformFee(String(sData.platformFeePercentage ?? 20));
          setBaseCallPrice(String(sData.baseLiveCallPricePerMinute ?? 500));
          setSlaDays(String(sData.responseSlaDays ?? 7));
          setAllowAdminRegistration(sData.allowAdminRegistration !== false);
        }
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleRegistrationLockdown = async () => {
    if (!adminToken) return;
    setTogglingRegistration(true);
    setEconomicsSuccess(null);
    setEconomicsError(null);
    try {
      const newStatus = !allowAdminRegistration;
      await safeFetchJson(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowAdminRegistration: newStatus,
        }),
      });
      setAllowAdminRegistration(newStatus);
      setEconomicsSuccess(
        newStatus
          ? 'Admin registration unlocked! New admin accounts can now be created.'
          : 'Admin registration locked down! Unauthorized signup is now prevented.'
      );
    } catch (err: any) {
      setEconomicsError(err.message || 'Failed to update registration status');
    } finally {
      setTogglingRegistration(false);
    }
  };

  const handleSaveEconomics = async () => {
    if (!adminToken) return;
    setSavingEconomics(true);
    setEconomicsSuccess(null);
    setEconomicsError(null);
    try {
      await safeFetchJson(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformFeePercentage: Number(platformFee),
          baseLiveCallPricePerMinute: Number(baseCallPrice),
          responseSlaDays: Number(slaDays),
          allowAdminRegistration: allowAdminRegistration,
        }),
      });
      setEconomicsSuccess('Platform economics and security policy updated successfully!');
    } catch (err: any) {
      setEconomicsError(err.message || 'Failed to save economics settings');
    } finally {
      setSavingEconomics(false);
    }
  };

  const handleReviewVerification = async (profileId: string, action: 'approve' | 'reject') => {
    if (!adminToken) return;
    setActionLoadingId(profileId);
    try {
      const res = await fetch(`${API_URL}/admin/verifications/${profileId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, adminNotes: `Reviewed via Admin Portal` }),
      });
      if (res.ok) {
        await loadAdminData();
      }
    } catch (err) {
      console.warn('Review failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Login view
  if (!adminToken) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#0B0F14' }}
        className="justify-center items-center px-6"
      >
        <View
          style={{ backgroundColor: '#131A22', borderColor: '#222D3D', maxWidth: 480 }}
          className="w-full rounded-3xl p-8 border shadow-2xl"
        >
          <View className="flex-row items-center mb-6">
            <View className="p-3 bg-emerald-500/10 rounded-2xl mr-3">
              <ShieldAlert size={28} color="#059669" />
            </View>
            <View>
              <Text className="text-white text-2xl font-black">Executive Admin</Text>
              <Text className="text-slate-400 text-xs">HaappyConnect Governance Portal</Text>
            </View>
          </View>

          {/* Mode Switcher Tabs */}
          <View className="flex-row bg-[#18222E] rounded-2xl p-1 mb-6 border border-[#243242]">
            <TouchableOpacity
              onPress={() => {
                setIsCreateMode(false);
                setLoginError(null);
                setCreateSuccess(null);
              }}
              style={{
                backgroundColor: !isCreateMode ? '#059669' : 'transparent',
              }}
              className="flex-1 py-2.5 rounded-xl items-center"
            >
              <Text
                style={{
                  color: !isCreateMode ? '#FFFFFF' : '#94A3B8',
                  fontWeight: '700',
                }}
                className="text-xs uppercase tracking-wider"
              >
                Sign In
              </Text>
            </TouchableOpacity>

            {allowAdminRegistration ? (
              <TouchableOpacity
                onPress={() => {
                  setIsCreateMode(true);
                  setLoginError(null);
                  setCreateSuccess(null);
                }}
                style={{
                  backgroundColor: isCreateMode ? '#059669' : 'transparent',
                }}
                className="flex-1 py-2.5 rounded-xl items-center"
              >
                <Text
                  style={{
                    color: isCreateMode ? '#FFFFFF' : '#94A3B8',
                    fontWeight: '700',
                  }}
                  className="text-xs uppercase tracking-wider"
                >
                  Create Admin
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1 py-2.5 rounded-xl items-center flex-row justify-center opacity-60">
                <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Registration Locked
                </Text>
              </View>
            )}
          </View>

          {!allowAdminRegistration && (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-4 flex-row items-center">
              <Lock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text className="text-amber-400 text-xs flex-1">
                New administrator registration is locked down to prevent unauthorized access.
              </Text>
            </View>
          )}

          {loginError && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-4">
              <Text className="text-red-400 text-xs font-semibold">{loginError}</Text>
            </View>
          )}

          {createSuccess && (
            <View className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 mb-4">
              <Text className="text-emerald-400 text-xs font-semibold">{createSuccess}</Text>
            </View>
          )}

          {isCreateMode && (
            <View className="mb-4">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Full Name (Optional)</Text>
              <TextInput
                value={adminName}
                onChangeText={setAdminName}
                placeholder="Platform Administrator"
                placeholderTextColor="#475569"
                className="w-full bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-sm"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Admin Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="admin@haappyconnect.com"
              placeholderTextColor="#475569"
              className="w-full bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-sm"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className={isCreateMode ? "mb-4" : "mb-6"}>
            <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Password</Text>
            <View className="flex-row items-center bg-[#18222E] border border-[#243242] rounded-2xl px-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                className="flex-1 py-3 text-white text-sm"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="p-1"
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94A3B8" />
                ) : (
                  <Eye size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isCreateMode && (
            <View className="mb-6">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Confirm Password</Text>
              <View className="flex-row items-center bg-[#18222E] border border-[#243242] rounded-2xl px-4">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 py-3 text-white text-sm"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#94A3B8" />
                  ) : (
                    <Eye size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={isCreateMode ? handleAdminCreate : handleAdminLogin}
            disabled={loginLoading}
            className="w-full bg-primary-500 py-3.5 rounded-2xl items-center justify-center shadow-lg active:opacity-90"
          >
            {loginLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isCreateMode ? 'Create Administrator Account' : 'Sign In to Dashboard'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!isCreateMode && !allowAdminRegistration) return;
              setIsCreateMode(!isCreateMode);
              setLoginError(null);
              setCreateSuccess(null);
            }}
            disabled={!isCreateMode && !allowAdminRegistration}
            className="mt-4 items-center py-2"
          >
            <Text className="text-slate-400 text-xs">
              {isCreateMode ? (
                <>Already an administrator? <Text className="text-emerald-400 font-bold">Sign In</Text></>
              ) : allowAdminRegistration ? (
                <>Need to set up an admin account? <Text className="text-emerald-400 font-bold">Create Account</Text></>
              ) : (
                <Text className="text-slate-500 italic">Registration locked by governance policy</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Dashboard view
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F14' }}>
      {/* Top Header */}
      <View
        style={{ backgroundColor: '#131A22', borderColor: '#222D3D' }}
        className="px-8 py-4 flex-row justify-between items-center border-b"
      >
        <View className="flex-row items-center">
          <View className="p-2 bg-emerald-500/10 rounded-xl mr-3">
            <ShieldAlert size={22} color="#059669" />
          </View>
          <View>
            <Text className="text-white font-black text-lg">HaappyConnect Executive</Text>
            <Text className="text-slate-400 text-xs">Admin & Expert Verification Suite</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={loadAdminData}
            className="p-2 rounded-xl bg-slate-800 flex-row items-center"
          >
            <RefreshCw size={16} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center bg-red-500/15 border border-red-500/30 px-3.5 py-2 rounded-xl"
          >
            <LogOut size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text className="text-red-400 text-xs font-bold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        {stats && (
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-[#131A22] border border-[#222D3D] rounded-3xl p-5">
              <Text className="text-slate-400 text-xs font-bold uppercase">Total Users</Text>
              <Text className="text-white text-3xl font-black mt-1">{stats.totalUsers || 0}</Text>
            </View>
            <View className="flex-1 bg-[#131A22] border border-[#222D3D] rounded-3xl p-5">
              <Text className="text-slate-400 text-xs font-bold uppercase">Experts</Text>
              <Text className="text-white text-3xl font-black mt-1">{stats.totalExperts || 0}</Text>
            </View>
            <View className="flex-1 bg-[#131A22] border border-[#222D3D] rounded-3xl p-5">
              <Text className="text-slate-400 text-xs font-bold uppercase">Completed Bookings</Text>
              <Text className="text-white text-3xl font-black mt-1">{stats.completedBookings || 0}</Text>
            </View>
          </View>
        )}

        {/* Tab Controls */}
        <View className="flex-row gap-2 mb-6 border-b border-[#222D3D] pb-3">
          <TouchableOpacity
            onPress={() => setTab('verifications')}
            className={`px-5 py-2.5 rounded-xl ${
              tab === 'verifications' ? 'bg-primary-500' : 'bg-[#131A22]'
            }`}
          >
            <Text className={`font-bold text-sm ${tab === 'verifications' ? 'text-white' : 'text-slate-400'}`}>
              Expert Verifications ({verifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('users')}
            className={`px-5 py-2.5 rounded-xl ${
              tab === 'users' ? 'bg-primary-500' : 'bg-[#131A22]'
            }`}
          >
            <Text className={`font-bold text-sm ${tab === 'users' ? 'text-white' : 'text-slate-400'}`}>
              User Registry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('economics')}
            className={`px-5 py-2.5 rounded-xl ${
              tab === 'economics' ? 'bg-primary-500' : 'bg-[#131A22]'
            }`}
          >
            <Text className={`font-bold text-sm ${tab === 'economics' ? 'text-white' : 'text-slate-400'}`}>
              Platform Economics & SLA
            </Text>
          </TouchableOpacity>
        </View>

        {loadingData ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : tab === 'verifications' ? (
          <View>
            {verifications.length === 0 ? (
              <View className="bg-[#131A22] border border-[#222D3D] rounded-3xl p-8 items-center">
                <CheckCircle size={36} color="#059669" style={{ marginBottom: 8 }} />
                <Text className="text-white font-bold text-base">All Caught Up</Text>
                <Text className="text-slate-400 text-xs mt-1">No pending expert verifications awaiting review.</Text>
              </View>
            ) : (
              verifications.map((item) => (
                <View
                  key={item._id}
                  className="bg-[#131A22] border border-[#222D3D] rounded-3xl p-6 mb-4"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View>
                      <Text className="text-white text-lg font-black">{item.fullName}</Text>
                      <Text className="text-emerald-400 text-xs font-semibold">@{item.username || 'expert'} • {item.user?.email}</Text>
                      <Text className="text-slate-400 text-xs mt-1">{item.headline || 'No headline'}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`px-3 py-1 rounded-full border ${
                          item.isVerified
                            ? 'bg-emerald-500/15 border-emerald-500/30'
                            : item.verificationStatus === 'pending'
                            ? 'bg-amber-500/15 border-amber-500/30'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <Text
                          className={`text-xs font-black uppercase ${
                            item.isVerified
                              ? 'text-emerald-400'
                              : item.verificationStatus === 'pending'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.isVerified ? 'Verified' : item.verificationStatus || 'Unsubmitted'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Submission details */}
                  {item.verificationData && (
                    <View className="bg-[#0B0F14] rounded-2xl p-4 mb-4 border border-[#1E293B]">
                      <Text className="text-slate-400 text-[11px] font-bold uppercase mb-2">
                        Cross-Examination Answers:
                      </Text>
                      <Text className="text-slate-300 text-xs mb-2 leading-relaxed">
                        <Text className="font-bold text-white">Experience:</Text>{' '}
                        {item.verificationData.yearsOfExperience || 0} years
                      </Text>
                      {item.verificationData.portfolioUrl && (
                        <Text className="text-slate-300 text-xs mb-2">
                          <Text className="font-bold text-white">Portfolio:</Text>{' '}
                          {item.verificationData.portfolioUrl}
                        </Text>
                      )}
                      {item.verificationData.mentorshipStatement && (
                        <Text className="text-slate-300 text-xs mb-2 leading-relaxed">
                          <Text className="font-bold text-white">Statement:</Text>{' '}
                          {item.verificationData.mentorshipStatement}
                        </Text>
                      )}
                      {item.verificationData.idDocumentUrl && (
                        <Text className="text-slate-300 text-xs mb-2">
                          <Text className="font-bold text-white">ID Link:</Text>{' '}
                          {item.verificationData.idDocumentUrl}
                        </Text>
                      )}
                      {item.verificationData.certifications?.length > 0 && (
                        <View className="mt-2 pt-2 border-t border-[#1E293B]">
                          <Text className="text-slate-400 text-[11px] font-bold uppercase mb-1">
                            Certifications ({item.verificationData.certifications.length}):
                          </Text>
                          {item.verificationData.certifications.map((c: any, ci: number) => (
                            <Text key={ci} className="text-slate-300 text-xs">
                              • {c.title} ({c.issuer} - {c.year})
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Review Actions */}
                  <View className="flex-row justify-end gap-3 pt-2">
                    <TouchableOpacity
                      onPress={() => handleReviewVerification(item._id, 'reject')}
                      disabled={actionLoadingId === item._id}
                      className="flex-row items-center bg-red-500/15 border border-red-500/30 px-4 py-2 rounded-xl"
                    >
                      <XCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text className="text-red-400 text-xs font-bold">Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleReviewVerification(item._id, 'approve')}
                      disabled={actionLoadingId === item._id}
                      className="flex-row items-center bg-primary-500 px-5 py-2 rounded-xl shadow-md"
                    >
                      <CheckCircle size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text className="text-white text-xs font-bold">Approve & Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : tab === 'users' ? (
          <View>
            {usersList.map((u) => (
              <View
                key={u._id}
                className="bg-[#131A22] border border-[#222D3D] rounded-2xl p-4 mb-2.5 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-white text-sm font-bold">{u.email}</Text>
                  <Text className="text-slate-400 text-xs">
                    Role: <Text className="text-emerald-400 font-bold uppercase">{u.role}</Text> • Created {new Date(u.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View className="bg-slate-800 px-3 py-1 rounded-full">
                  <Text className="text-slate-300 text-xs font-semibold">
                    {u.isOnboarded ? 'Onboarded' : 'Pending Onboarding'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="max-w-2xl">
            <View className="bg-[#131A22] border border-[#222D3D] rounded-3xl p-6 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="p-2.5 bg-emerald-500/10 rounded-2xl mr-3">
                  <SlidersHorizontal size={22} color="#059669" />
                </View>
                <View>
                  <Text className="text-white text-lg font-black">Platform Economics & Governance</Text>
                  <Text className="text-slate-400 text-xs">Configure take-rates, dynamic call base pricing, and escrow SLA</Text>
                </View>
              </View>

              {economicsSuccess && (
                <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-5 flex-row items-center">
                  <CheckCircle size={18} color="#059669" style={{ marginRight: 8 }} />
                  <Text className="text-emerald-400 text-xs font-semibold flex-1">{economicsSuccess}</Text>
                </View>
              )}

              {economicsError && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-5 flex-row items-center">
                  <XCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text className="text-red-400 text-xs font-semibold flex-1">{economicsError}</Text>
                </View>
              )}

              {/* 1. Platform Fee / Split */}
              <View className="mb-5 pb-5 border-b border-[#1E293B]">
                <Text className="text-white text-sm font-bold mb-1">Platform Commission Fee (%)</Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Default 20% (giving experts an 80% payout on all consultations and calls). Admin can adjust dynamically.
                </Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={platformFee}
                    onChangeText={setPlatformFee}
                    placeholder="20"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    className="w-32 bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-base font-bold text-center"
                  />
                  <View className="bg-slate-800/80 px-4 py-3 rounded-2xl">
                    <Text className="text-emerald-400 text-xs font-bold">
                      Expert Payout: {100 - (Number(platformFee) || 0)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. Base Live Call Price Per Minute */}
              <View className="mb-5 pb-5 border-b border-[#1E293B]">
                <Text className="text-white text-sm font-bold mb-1">Live Call Base Rate Per Minute (₦)</Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Minimum platform base rate for live 1:1 calls. Dynamically matches macroeconomic ups and downs.
                </Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={baseCallPrice}
                    onChangeText={setBaseCallPrice}
                    placeholder="500"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    className="w-40 bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-base font-bold text-center"
                  />
                  <Text className="text-slate-400 text-xs">
                    (e.g., ₦{(Number(baseCallPrice) || 500) * 15} for minimum 15-min call slot)
                  </Text>
                </View>
              </View>

              {/* 3. Escrow Hold / Response SLA Days */}
              <View className="mb-6">
                <Text className="text-white text-sm font-bold mb-1">Consultation Response SLA (Days)</Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Escrow hold window. If an expert fails to answer within this period, funds are automatically refunded to seeker with push notifications.
                </Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={slaDays}
                    onChangeText={setSlaDays}
                    placeholder="7"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    className="w-32 bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-base font-bold text-center"
                  />
                  <Text className="text-slate-400 text-xs">Days auto-refund escrow hold</Text>
                </View>
              </View>

              {/* 4. Portal Security & Registration Access Control */}
              <View className="mb-6 pt-5 border-t border-[#1E293B]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Lock size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                    <Text className="text-white text-sm font-bold">Admin Registration Access</Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      allowAdminRegistration ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${
                        allowAdminRegistration ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {allowAdminRegistration ? 'Open / Permitted' : 'Locked Down'}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-400 text-xs mb-4">
                  {allowAdminRegistration
                    ? 'Registration is currently ENABLED. Anyone visiting the admin portal can create an administrator account. Disable registration now that your admin account is setup to prevent unauthorized access.'
                    : 'Registration is currently LOCKED DOWN. New admin account signups are completely disabled on this portal. Only existing administrators can log in.'}
                </Text>
                <TouchableOpacity
                  onPress={handleToggleRegistrationLockdown}
                  disabled={togglingRegistration}
                  style={{
                    backgroundColor: allowAdminRegistration ? '#7F1D1D' : '#065F46',
                    borderColor: allowAdminRegistration ? '#DC2626' : '#059669',
                  }}
                  className="w-full py-3 rounded-2xl items-center justify-center border flex-row"
                >
                  {togglingRegistration ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      {allowAdminRegistration ? (
                        <Lock size={16} color="#FCA5A5" style={{ marginRight: 8 }} />
                      ) : (
                        <ShieldCheck size={16} color="#6EE7B7" style={{ marginRight: 8 }} />
                      )}
                      <Text
                        style={{ color: allowAdminRegistration ? '#FECACA' : '#A7F3D0' }}
                        className="font-bold text-xs uppercase tracking-wider"
                      >
                        {allowAdminRegistration
                          ? 'Disable Registration (Lock Down Portal)'
                          : 'Enable Registration (Unlock Portal)'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleSaveEconomics}
                disabled={savingEconomics}
                className="w-full bg-primary-500 py-3.5 rounded-2xl items-center justify-center shadow-lg active:opacity-90"
              >
                {savingEconomics ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-white font-bold text-sm">Save Economic Policies</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
