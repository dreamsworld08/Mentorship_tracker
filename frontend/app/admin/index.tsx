import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [analyticsData, announcementsData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getAnnouncements(),
      ]);
      setAnalytics(analyticsData);
      setAnnouncements(announcementsData.slice(0, 3));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Sleepy Classes IAS Platform</Text>
        </View>

        {/* Key Metrics - Now Functional Buttons */}
        <View style={styles.metricsGrid}>
          {[
            { icon: 'school', label: 'Students', value: analytics?.total_students || 0, color: theme.colors.primary, tab: 'users', filter: 'student' },
            { icon: 'people', label: 'Mentors', value: analytics?.total_mentors || 0, color: theme.colors.accent, tab: 'users', filter: 'mentor' },
            { icon: 'library', label: 'Topics', value: analytics?.total_topics || 0, color: theme.colors.success, tab: 'content' },
            { icon: 'trending-up', label: 'Avg Progress', value: `${analytics?.avg_completion || 0}%`, color: theme.colors.primaryLight, tab: 'content' },
            { icon: 'checkbox', label: 'Tasks', value: analytics?.total_tasks || 0, color: theme.colors.warning, tab: 'content' },
            { icon: 'videocam', label: 'Sessions', value: analytics?.total_sessions || 0, color: theme.colors.danger, tab: 'content' },
          ].map((m, i) => (
            <TouchableOpacity key={i} style={styles.metricCard} testID={`metric-${m.label.toLowerCase()}`} activeOpacity={0.7}
              onPress={() => {
                if (m.tab === 'users') {
                  router.push('/admin/users');
                } else {
                  router.push('/admin/content');
                }
              }}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '15' }]}>
                <Ionicons name={m.icon as any} size={20} color={m.color} />
              </View>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <View style={styles.taskOverview}>
            <View style={styles.taskBar}>
              <View style={[styles.taskBarSegment, { flex: analytics?.completed_tasks || 1, backgroundColor: theme.colors.success }]} />
              <View style={[styles.taskBarSegment, { flex: analytics?.pending_tasks || 1, backgroundColor: theme.colors.warning }]} />
            </View>
            <View style={styles.taskLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.legendText}>Completed ({analytics?.completed_tasks || 0})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.legendText}>Pending ({analytics?.pending_tasks || 0})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Batch Stats */}
        {analytics?.batch_stats?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Students by Batch</Text>
            {analytics.batch_stats.map((b: any, i: number) => (
              <View key={i} style={styles.batchRow}>
                <Text style={styles.batchName}>{b.batch}</Text>
                <View style={styles.batchBarBg}>
                  <View style={[styles.batchBarFill, { width: `${(b.count / analytics.total_students) * 100}%` }]} />
                </View>
                <Text style={styles.batchCount}>{b.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Announcements */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Announcements</Text>
            {announcements.map((ann: any) => (
              <View key={ann.announcement_id} style={styles.announcementCard}>
                <Text style={styles.announcementTitle}>{ann.title}</Text>
                <Text style={styles.announcementBody} numberOfLines={2}>{ann.body}</Text>
                <Text style={styles.announcementDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  metricCard: { width: '30%', backgroundColor: theme.colors.paper, borderRadius: 14, padding: 14, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  metricIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  taskOverview: { backgroundColor: theme.colors.paper, borderRadius: 14, padding: 16, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  taskBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  taskBarSegment: { height: 10 },
  taskLegend: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  batchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  batchName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, width: 100 },
  batchBarBg: { flex: 1, height: 6, backgroundColor: theme.colors.subtle, borderRadius: 3 },
  batchBarFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 3 },
  batchCount: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, width: 30, textAlign: 'right' },
  announcementCard: { backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  announcementTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  announcementBody: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  announcementDate: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 6 },
});
