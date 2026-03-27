import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function StudentHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [callRequested, setCallRequested] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [summaryData, tasksData, announcementsData] = await Promise.all([
        api.getTrackerSummary(user.user_id),
        api.getTasks(),
        api.getAnnouncements(),
      ]);
      setSummary(summaryData);
      setTasks(tasksData.filter((t: any) => t.status !== 'completed').slice(0, 5));
      setAnnouncements(announcementsData.slice(0, 3));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const overallPct = summary ? Math.round((summary.completed / summary.total_topics) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Student'}</Text>
          </View>
          <View style={styles.avatar}>
            {user?.profile_photo_url ? (
              <Image source={{ uri: user.profile_photo_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={24} color={theme.colors.textInverse} />
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.statValue}>{overallPct}%</Text>
            <Text style={styles.statLabel}>Overall</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.paper }]}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>{summary?.completed || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.paper }]}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>{summary?.in_progress || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.paper }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{summary?.total_hours || 0}h</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Hours</Text>
          </View>
        </View>

        {/* My Mentor Card */}
        {user?.mentor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Mentor</Text>
            <View style={styles.mentorCard}>
              <View style={styles.mentorAvatar}>
                {user.mentor.profile_photo_url ? (
                  <Image source={{ uri: user.mentor.profile_photo_url }} style={styles.mentorAvatarImg} />
                ) : (
                  <Ionicons name="person" size={24} color={theme.colors.textInverse} />
                )}
              </View>
              <View style={styles.mentorInfo}>
                <Text style={styles.mentorName}>{user.mentor.name}</Text>
                <Text style={styles.mentorEmail}>{user.mentor.email}</Text>
              </View>
              <TouchableOpacity testID="chat-mentor-btn" style={styles.mentorChatBtn}>
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity testID="request-call-btn" style={styles.requestCallBtn} onPress={async () => {
              try { await api.createCallRequest('I would like to schedule a mentorship call'); setCallRequested(true); } catch (e) { console.error(e); }
            }} disabled={callRequested}>
              <Ionicons name={callRequested ? 'checkmark-circle' : 'call'} size={18} color={callRequested ? theme.colors.success : theme.colors.primary} />
              <Text style={[styles.requestCallText, callRequested && { color: theme.colors.success }]}>{callRequested ? 'Call Requested' : 'Request Mentor Call'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stage Progress */}
        {summary?.stage_progress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preparation Progress</Text>
            {summary.stage_progress.map((stage: any) => (
              <View key={stage.stage_id} style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressName}>{stage.name}</Text>
                  <Text style={styles.progressPct}>{stage.pct}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(stage.pct, 100)}%` }]} />
                </View>
                <Text style={styles.progressDetail}>{stage.completed}/{stage.total} topics completed</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No pending tasks. Your mentor will assign some soon!</Text>
            </View>
          ) : (
            tasks.map((task: any) => (
              <View key={task.task_id} style={styles.taskCard} testID={`task-${task.task_id}`}>
                <View style={[styles.taskDot, { backgroundColor: task.status === 'in_progress' ? theme.colors.warning : theme.colors.textTertiary }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={styles.taskDue}>Due: {new Date(task.due_date).toLocaleDateString()}</Text>
                  )}
                </View>
                <View style={[styles.taskBadge, { backgroundColor: task.status === 'in_progress' ? theme.colors.warningBg : theme.colors.subtle }]}>
                  <Text style={[styles.taskBadgeText, { color: task.status === 'in_progress' ? theme.colors.warning : theme.colors.textTertiary }]}>
                    {task.status === 'in_progress' ? 'Active' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            {announcements.map((ann: any) => (
              <View key={ann.announcement_id} style={styles.announcementCard}>
                <Ionicons name="megaphone" size={18} color={theme.colors.accent} />
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{ann.title}</Text>
                  <Text style={styles.announcementBody} numberOfLines={2}>{ann.body}</Text>
                </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  greeting: { fontSize: 14, color: theme.colors.textSecondary },
  userName: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  statValue: { fontSize: 20, fontWeight: '800', color: theme.colors.textInverse },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  mentorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  mentorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mentorAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  mentorInfo: { flex: 1, marginLeft: 12 },
  mentorName: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  mentorEmail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  mentorChatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.subtle, justifyContent: 'center', alignItems: 'center' },
  requestCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.primary + '10', borderWidth: 1, borderColor: theme.colors.primary + '30', gap: 8 },
  requestCallText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  progressItem: { marginBottom: 14, backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  progressPct: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  progressBarBg: { height: 6, backgroundColor: theme.colors.subtle, borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: theme.colors.accent, borderRadius: 3 },
  progressDetail: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: theme.colors.paper, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderLight },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskContent: { flex: 1, marginLeft: 12 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  taskDue: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  taskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  taskBadgeText: { fontSize: 11, fontWeight: '700' },
  announcementCard: { flexDirection: 'row', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, gap: 12 },
  announcementContent: { flex: 1 },
  announcementTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  announcementBody: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
});
