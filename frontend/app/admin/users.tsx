import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await api.getUsers(filterRole || undefined);
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [filterRole]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const map: Record<string, any> = {
      admin: { bg: theme.colors.primaryDark + '20', text: theme.colors.primaryDark },
      mentor: { bg: theme.colors.accent + '20', text: theme.colors.accentDark },
      student: { bg: theme.colors.primary + '15', text: theme.colors.primary },
    };
    return map[role] || map.student;
  };

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>{users.length} total users</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            testID="user-search-input"
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Role Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {[null, 'student', 'mentor', 'admin'].map(role => (
          <TouchableOpacity
            key={role || 'all'}
            testID={`filter-${role || 'all'}`}
            style={[styles.filterBtn, filterRole === role && styles.filterBtnActive]}
            onPress={() => { setFilterRole(role); setLoading(true); }}
          >
            <Text style={[styles.filterBtnText, filterRole === role && styles.filterBtnTextActive]}>
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        {filtered.map(u => {
          const badge = getRoleBadge(u.role);
          return (
            <View key={u.user_id} style={styles.userCard} testID={`user-${u.user_id}`}>
              <View style={styles.userAvatar}>
                {u.profile_photo_url ? (
                  <Image source={{ uri: u.profile_photo_url }} style={styles.userAvatarImg} />
                ) : (
                  <Ionicons name="person" size={18} color={theme.colors.textInverse} />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
                {u.batch && <Text style={styles.userMeta}>{u.batch} {u.exam_year ? `• ${u.exam_year}` : ''}</Text>}
              </View>
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.roleText, { color: badge.text }]}>{u.role}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: u.is_active ? theme.colors.success : theme.colors.textTertiary }]} />
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.paper, borderWidth: 1, borderColor: theme.colors.border },
  filterBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterBtnTextActive: { color: theme.colors.textInverse },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 12, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, gap: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  userAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  userEmail: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  userMeta: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
