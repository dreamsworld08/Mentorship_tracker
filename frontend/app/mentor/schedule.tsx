import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function MentorSchedule() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></SafeAreaView>;
  }

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Manage your mentorship sessions</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Sessions ({upcoming.length})</Text>
          {upcoming.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No upcoming sessions</Text>
            </View>
          ) : (
            upcoming.map(s => (
              <View key={s.session_id} style={styles.sessionCard} testID={`session-${s.session_id}`}>
                <View style={[styles.sessionDot, { backgroundColor: theme.colors.accent }]} />
                <View style={styles.sessionContent}>
                  <Text style={styles.sessionStudent}>{s.student?.name || 'Student'}</Text>
                  <Text style={styles.sessionTime}>{new Date(s.scheduled_at).toLocaleString()}</Text>
                  <Text style={styles.sessionAgenda}>{s.agenda || 'No agenda set'}</Text>
                </View>
                <View style={styles.sessionDuration}>
                  <Text style={styles.durationText}>{s.duration_minutes}m</Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Sessions ({past.length})</Text>
          {past.map(s => (
            <View key={s.session_id} style={[styles.sessionCard, { opacity: 0.7 }]}>
              <View style={[styles.sessionDot, { backgroundColor: theme.colors.success }]} />
              <View style={styles.sessionContent}>
                <Text style={styles.sessionStudent}>{s.student?.name || 'Student'}</Text>
                <Text style={styles.sessionTime}>{new Date(s.scheduled_at).toLocaleString()}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </View>
          ))}
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
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: theme.colors.paper, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 8 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, gap: 12 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionContent: { flex: 1 },
  sessionStudent: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  sessionTime: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  sessionAgenda: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  sessionDuration: { backgroundColor: theme.colors.subtle, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  durationText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
});
