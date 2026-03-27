import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Image, Platform, KeyboardAvoidingView,
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'student', phone: '', batch: '', course: '', exam_year: '', optional_subject: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<string[]>([]);
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const EXAM_YEARS = ['2025', '2026', '2027', '2028'];
  const BATCH_OPTIONS = ['Batch 2025-A', 'Batch 2025-B', 'Batch 2026-A', 'Batch 2026-B', 'Batch 2027-A'];

  const loadData = async () => {
    try {
      const [data, batchData, subjData] = await Promise.all([
        api.getUsers(filterRole || undefined),
        api.getBatches().catch(() => []),
        api.getOptionalSubjects().catch(() => []),
      ]);
      setUsers(data); setBatches([...new Set([...BATCH_OPTIONS, ...batchData])]); setOptionalSubjects(subjData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { setLoading(true); loadData(); }, [filterRole]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!formData.name.trim() || !formData.email.trim()) { setError('Name and Email are required'); return; }
    setSubmitting(true); setError('');
    try {
      await api.createUser(formData);
      setShowAddForm(false);
      setFormData({ name: '', email: '', role: 'student', phone: '', batch: '', course: '', exam_year: '', optional_subject: '' });
      loadData();
    } catch (e: any) { setError(e.message || 'Failed to add user'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      setShowDeleteConfirm(null);
      loadData();
    } catch (e: any) { setError(e.message); }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, any> = {
      admin: { bg: theme.colors.primaryDark + '20', text: theme.colors.primaryDark },
      mentor: { bg: theme.colors.accent + '20', text: theme.colors.accentDark },
      student: { bg: theme.colors.primary + '15', text: theme.colors.primary },
    };
    return map[role] || map.student;
  };

  if (loading && !refreshing) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>{users.length} total users</Text>
        </View>
        <TouchableOpacity testID="add-user-btn" style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)}>
          <Ionicons name={showAddForm ? 'close' : 'person-add'} size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Add User Form */}
      {showAddForm && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formCard}>
            <Text style={styles.formTitle}>Add New User</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput testID="add-name-input" style={styles.input} placeholder="Full Name *" placeholderTextColor={theme.colors.textTertiary} value={formData.name} onChangeText={v => setFormData({...formData, name: v})} />
            <TextInput testID="add-email-input" style={styles.input} placeholder="Email *" placeholderTextColor={theme.colors.textTertiary} value={formData.email} onChangeText={v => setFormData({...formData, email: v})} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.roleSelector}>
              {['student', 'mentor', 'admin'].map(r => (
                <TouchableOpacity key={r} testID={`role-select-${r}`} style={[styles.roleOption, formData.role === r && styles.roleOptionActive]} onPress={() => setFormData({...formData, role: r})}>
                  <Text style={[styles.roleOptionText, formData.role === r && styles.roleOptionTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={theme.colors.textTertiary} value={formData.phone} onChangeText={v => setFormData({...formData, phone: v})} />
            <Text style={styles.fieldLabel}>Batch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {batches.map(b => (
                <TouchableOpacity key={b} style={[styles.chipBtn, formData.batch === b && styles.chipActive]} onPress={() => setFormData({...formData, batch: b})}>
                  <Text style={[styles.chipText, formData.batch === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} placeholder="Course" placeholderTextColor={theme.colors.textTertiary} value={formData.course} onChangeText={v => setFormData({...formData, course: v})} />
            <Text style={styles.fieldLabel}>Exam Year</Text>
            <View style={styles.chipRow}>
              {EXAM_YEARS.map(y => (
                <TouchableOpacity key={y} style={[styles.chipBtn, formData.exam_year === y && styles.chipActive]} onPress={() => setFormData({...formData, exam_year: y})}>
                  <Text style={[styles.chipText, formData.exam_year === y && styles.chipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Optional Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {optionalSubjects.map(s => (
                <TouchableOpacity key={s} style={[styles.chipBtn, formData.optional_subject === s && styles.chipActive]} onPress={() => setFormData({...formData, optional_subject: s})}>
                  <Text style={[styles.chipText, formData.optional_subject === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity testID="submit-add-user" style={styles.submitBtn} onPress={handleAddUser} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Add User</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!showAddForm && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
              <TextInput testID="user-search-input" style={styles.searchInput} placeholder="Search users..." placeholderTextColor={theme.colors.textTertiary} value={search} onChangeText={setSearch} />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {[null, 'student', 'mentor', 'admin'].map(role => (
              <TouchableOpacity key={role || 'all'} testID={`filter-${role || 'all'}`} style={[styles.filterBtn, filterRole === role && styles.filterBtnActive]} onPress={() => setFilterRole(role)}>
                <Text style={[styles.filterBtnText, filterRole === role && styles.filterBtnTextActive]}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'All'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
            {filtered.map(u => {
              const badge = getRoleBadge(u.role);
              return (
                <View key={u.user_id} style={styles.userCard} testID={`user-${u.user_id}`}>
                  <View style={styles.userAvatar}>
                    {u.profile_photo_url ? <Image source={{ uri: u.profile_photo_url }} style={styles.userAvatarImg} /> : <Ionicons name="person" size={18} color={theme.colors.textInverse} />}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    {u.batch && <Text style={styles.userMeta}>{u.batch} {u.exam_year ? `• ${u.exam_year}` : ''}</Text>}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleText, { color: badge.text }]}>{u.role}</Text>
                  </View>
                  <TouchableOpacity testID={`delete-user-${u.user_id}`} style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(u.user_id)}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="warning" size={32} color={theme.colors.danger} />
            <Text style={styles.modalTitle}>Deactivate User</Text>
            <Text style={styles.modalBody}>This will deactivate the user. They won't be able to login.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteConfirm(null)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={() => handleDeleteUser(showDeleteConfirm)}><Text style={styles.modalDeleteText}>Deactivate</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  formScroll: { maxHeight: 500 },
  formCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  formTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  errorText: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, backgroundColor: theme.colors.dangerBg, padding: 10, borderRadius: 8 },
  input: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.subtle, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center' },
  roleOptionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' },
  roleOptionText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  roleOptionTextActive: { color: theme.colors.primary },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.dangerBg, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { backgroundColor: theme.colors.paper, borderRadius: 20, padding: 24, width: '80%', maxWidth: 340, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 8, marginBottom: 8 },
  modalBody: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  modalDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.danger, alignItems: 'center' },
  modalDeleteText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
