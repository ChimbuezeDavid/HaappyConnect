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
} from 'lucide-react-native';
import { api, API_URL } from '@/lib/api';

export default function AdminScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data
  const [tab, setTab] = useState<'verifications' | 'users' | 'consultations'>('verifications');
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Check stored admin token on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem('hc_admin_token');
      if (stored) {
        setAdminToken(stored);
      }
    }
  }, []);

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
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setAdminToken(data.token);
      if (Platform.OS === 'web') {
        localStorage.setItem('hc_admin_token', data.token);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    if (Platform.OS === 'web') {
      localStorage.removeItem('hc_admin_token');
    }
  };

  const loadAdminData = async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      // 1. Dashboard summary
      const dashRes = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
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
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoadingData(false);
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
          style={{ backgroundColor: '#131A22', borderColor: '#222D3D', maxWidth: 460 }}
          className="w-full rounded-3xl p-8 border shadow-2xl"
        >
          <View className="flex-row items-center mb-4">
            <View className="p-3 bg-emerald-500/10 rounded-2xl mr-3">
              <ShieldAlert size={28} color="#059669" />
            </View>
            <View>
              <Text className="text-white text-2xl font-black">Executive Admin</Text>
              <Text className="text-slate-400 text-xs">HaappyConnect Governance Portal</Text>
            </View>
          </View>

          {loginError && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-4">
              <Text className="text-red-400 text-xs font-semibold">{loginError}</Text>
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
            />
          </View>

          <View className="mb-6">
            <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              className="w-full bg-[#18222E] border border-[#243242] rounded-2xl px-4 py-3 text-white text-sm"
            />
          </View>

          <TouchableOpacity
            onPress={handleAdminLogin}
            disabled={loginLoading}
            className="w-full bg-primary-500 py-3.5 rounded-2xl items-center justify-center shadow-lg"
          >
            {loginLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In to Dashboard</Text>
            )}
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
        ) : (
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
        )}
      </ScrollView>
    </View>
  );
}
