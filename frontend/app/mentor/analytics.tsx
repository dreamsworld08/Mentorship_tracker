import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function MentorAnalytics() {
  const { user } = useAuth();
  const [mentees, setMentees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.getMentees(user.user_id)
        .then(setMentees)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></SafeAreaView>;
  }

  const avgCompletion = mentees.length ? Math.round(mentees.reduce((a, m) => a + (m.progress_summary?.avg_completion || 0), 0) / mentees.length) : 0;
  const totalHours = Math.round(mentees.reduce((a, m) => a + (m.progress_summary?.total_hours || 0), 0));
  const behindCount = mentees.filter(m => m.progress_summary?.status_color === 'red').length;
  const onTrackCount = mentees.filter(m => m.progress_summary?.status_color === 'green').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Mentee performance overview</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metricsGrid}>
          {[
            { label: 'Avg Completion', value: `${avgCompletion}%`, icon: 'trending-up', color: theme.colors.primary },
            { label: 'Total Hours', value: `${totalHours}h`, icon: 'time', color: theme.colors.accent },
            { label: 'On Track', value: onTrackCount, icon: 'checkmark-circle', color: theme.colors.success },
            { label: 'Need Help', value: behindCount, icon: 'alert-circle', color: theme.colors.danger },
          ].map((m, i) => (
            <View key={i} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '15' }]}>
                <Ionicons name={m.icon as any} size={22} color={m.color} />
              </View>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentee Rankings</Text>
          {[...mentees].sort((a, b) => (b.progress_summary?.avg_completion || 0) - (a.progress_summary?.avg_completion || 0)).map((m, i) => (
            <View key={m.user_id} style={styles.rankRow}>
              <Text style={styles.rankNum}>#{i + 1}</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{m.name}</Text>
                <View style={styles.rankBarBg}>
                  <View style={[styles.rankBarFill, { width: `${m.progress_summary?.avg_completion || 0}%` }]} />
                </View>
              </View>
              <Text style={styles.rankPct}>{Math.round(m.progress_summary?.avg_completion || 0)}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Students Needing Attention</Text>
          {mentees.filter(m => m.progress_summary?.status_color === 'red').length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="happy-outline" size={36} color={theme.colors.success} />
              <Text style={styles.emptyText}>All students are doing well!</Text>
            </View>
          ) : (
            mentees.filter(m => m.progress_summary?.status_color === 'red').map(m => (
              <View key={m.user_id} style={styles.alertCard}>
                <Ionicons name="warning" size={18} color={theme.colors.danger} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertName}>{m.name}</Text>
                  <Text style={styles.alertDetail}>{m.progress_summary?.avg_completion || 0}% avg • {m.pending_tasks || 0} pending tasks</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  metricCard: { width: '47%', backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  metricIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  rankNum: { fontSize: 14, fontWeight: '800', color: theme.colors.textTertiary, width: 28 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
  rankBarBg: { height: 6, backgroundColor: theme.colors.subtle, borderRadius: 3 },
  rankBarFill: { height: 6, backgroundColor: theme.colors.accent, borderRadius: 3 },
  rankPct: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, width: 40, textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingVertical: 24, backgroundColor: theme.colors.paper, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 8 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.dangerBg, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  alertContent: { flex: 1 },
  alertName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  alertDetail: { fontSize: 12, color: theme.colors.danger, marginTop: 2 },
});
