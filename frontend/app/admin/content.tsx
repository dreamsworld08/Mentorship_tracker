import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';
import SyllabusEditor from '../../src/SyllabusEditor';

type ActivePanel = null | 'announcements' | 'syllabus' | 'users' | 'reports';

export default function AdminContent() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [annData, syllData, analyticsData, usersData] = await Promise.all([
        api.getAnnouncements(),
        api.getSyllabus(),
        api.getAnalyticsOverview(),
        api.getUsers(),
      ]);
      setAnnouncements(annData);
      setSyllabus(syllData);
      setAnalytics(analyticsData);
      setUsers(usersData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !body.trim()) { setError('Please fill in all fields'); return; }
    try {
      await api.createAnnouncement({ title, body });
      setTitle(''); setBody(''); setError('');
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (e: any) { setError(e.message); }
  };

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  const renderPanel = () => {
    switch (activePanel) {
      case 'announcements':
        return (
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <TouchableOpacity onPress={() => setActivePanel(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.panelTitle}>Announcements</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formSubtitle}>Create New</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TextInput testID="ann-title-input" style={styles.input} placeholder="Title" placeholderTextColor={theme.colors.textTertiary} value={title} onChangeText={setTitle} />
              <TextInput testID="ann-body-input" style={[styles.input, styles.textArea]} placeholder="Body" placeholderTextColor={theme.colors.textTertiary} value={body} onChangeText={setBody} multiline numberOfLines={4} />
              <TouchableOpacity testID="submit-ann-btn" style={styles.submitBtn} onPress={handleCreateAnnouncement}>
                <Text style={styles.submitBtnText}>Publish</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.listTitle}>All Announcements ({announcements.length})</Text>
            {announcements.map(ann => (
              <View key={ann.announcement_id} style={styles.card}>
                <Text style={styles.cardTitle}>{ann.title}</Text>
                <Text style={styles.cardBody}>{ann.body}</Text>
                <Text style={styles.cardDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        );

      case 'syllabus':
        return (
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <TouchableOpacity onPress={() => setActivePanel(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.panelTitle}>Syllabus Configuration</Text>
            </View>
            <SyllabusEditor syllabus={syllabus} onRefresh={async () => { const d = await api.getSyllabus(); setSyllabus(d); }} />
          </View>
        );

      case 'users':
        return (
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <TouchableOpacity onPress={() => setActivePanel(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.panelTitle}>User Overview</Text>
            </View>
            {[
              { label: 'Total Students', value: users.filter(u => u.role === 'student').length, icon: 'school', color: theme.colors.primary },
              { label: 'Total Mentors', value: users.filter(u => u.role === 'mentor').length, icon: 'people', color: theme.colors.accent },
              { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: 'shield', color: theme.colors.primaryDark },
              { label: 'Active Users', value: users.filter(u => u.is_active).length, icon: 'checkmark-circle', color: theme.colors.success },
            ].map((item, i) => (
              <View key={i} style={styles.statRow}>
                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
            <Text style={styles.hint}>Go to "Users" tab to add/remove users</Text>
          </View>
        );

      case 'reports':
        return (
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <TouchableOpacity onPress={() => setActivePanel(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.panelTitle}>Reports & Analytics</Text>
            </View>
            {analytics && (
              <>
                {[
                  { label: 'Total Students', value: analytics.total_students },
                  { label: 'Total Mentors', value: analytics.total_mentors },
                  { label: 'Total Topics', value: analytics.total_topics },
                  { label: 'Avg Completion', value: `${analytics.avg_completion}%` },
                  { label: 'Total Tasks', value: analytics.total_tasks },
                  { label: 'Completed Tasks', value: analytics.completed_tasks },
                  { label: 'Pending Tasks', value: analytics.pending_tasks },
                  { label: 'Total Sessions', value: analytics.total_sessions },
                ].map((item, i) => (
                  <View key={i} style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{item.label}</Text>
                    <Text style={styles.reportValue}>{item.value}</Text>
                  </View>
                ))}
                {analytics.batch_stats?.map((b: any, i: number) => (
                  <View key={i} style={styles.reportRow}>
                    <Text style={styles.reportLabel}>{b.batch}</Text>
                    <Text style={styles.reportValue}>{b.count} students</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Content Management</Text>
          <Text style={styles.subtitle}>Manage platform content & settings</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {activePanel ? renderPanel() : (
            <View style={styles.mainContent}>
              {/* Quick Actions Grid */}
              <View style={styles.actionsGrid}>
                {[
                  { id: 'users' as ActivePanel, icon: 'people-circle', label: 'Manage Users', desc: 'View user stats', color: theme.colors.primary },
                  { id: 'syllabus' as ActivePanel, icon: 'git-branch', label: 'Syllabus Config', desc: 'View syllabus tree', color: theme.colors.accent },
                  { id: 'announcements' as ActivePanel, icon: 'megaphone', label: 'Announcements', desc: 'Create & manage', color: theme.colors.success },
                  { id: 'reports' as ActivePanel, icon: 'analytics', label: 'Reports', desc: 'View analytics', color: theme.colors.warning },
                ].map((action) => (
                  <TouchableOpacity key={action.id} testID={`action-${action.id}`} style={styles.actionCard} onPress={() => setActivePanel(action.id)} activeOpacity={0.7}>
                    <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                      <Ionicons name={action.icon as any} size={26} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionDesc}>{action.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <Text style={styles.sectionTitle}>Quick Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.quickStatCard}>
                    <Text style={[styles.quickStatValue, { color: theme.colors.primary }]}>{analytics?.total_students || 0}</Text>
                    <Text style={styles.quickStatLabel}>Students</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <Text style={[styles.quickStatValue, { color: theme.colors.accent }]}>{analytics?.total_mentors || 0}</Text>
                    <Text style={styles.quickStatLabel}>Mentors</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <Text style={[styles.quickStatValue, { color: theme.colors.success }]}>{announcements.length}</Text>
                    <Text style={styles.quickStatLabel}>Announces</Text>
                  </View>
                </View>
              </View>

              {/* Recent Announcements */}
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Recent Announcements</Text>
                {announcements.slice(0, 3).map(ann => (
                  <View key={ann.announcement_id} style={styles.card}>
                    <Text style={styles.cardTitle}>{ann.title}</Text>
                    <Text style={styles.cardBody} numberOfLines={2}>{ann.body}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  mainContent: { paddingHorizontal: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionCard: { width: '47%', backgroundColor: theme.colors.paper, borderRadius: 16, padding: 18, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  actionDesc: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  quickStats: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  quickStatCard: { flex: 1, backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  quickStatValue: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '600', marginTop: 2 },
  recentSection: { marginTop: 20 },
  card: { backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  cardBody: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  cardDate: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 6 },
  // Panel styles
  panelContent: { paddingHorizontal: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.subtle, justifyContent: 'center', alignItems: 'center' },
  panelTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  formCard: { backgroundColor: theme.colors.paper, borderRadius: 14, padding: 16, marginBottom: 16, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  formSubtitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 10 },
  errorText: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, backgroundColor: theme.colors.dangerBg, padding: 8, borderRadius: 8 },
  input: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 10 },
  // Syllabus
  syllabusStage: { marginBottom: 12, backgroundColor: theme.colors.paper, borderRadius: 14, padding: 14, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  syllabusStageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  syllabusStageTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  syllabusCount: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '600' },
  syllabusPaper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  syllabusPaperName: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, flex: 1 },
  // Stats
  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  statValue: { fontSize: 18, fontWeight: '800' },
  hint: { fontSize: 13, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
  // Reports
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: theme.colors.paper, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: theme.colors.borderLight },
  reportLabel: { fontSize: 14, color: theme.colors.textSecondary },
  reportValue: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
});
