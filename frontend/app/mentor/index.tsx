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

export default function MentorMentees() {
  const { user } = useAuth();
  const [mentees, setMentees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedMentee, setExpandedMentee] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.getMentees(user.user_id);
      setMentees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const filteredMentees = mentees.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (color: string) => {
    const colors: Record<string, any> = {
      green: { bg: theme.colors.successBg, text: theme.colors.success, label: 'On Track' },
      yellow: { bg: theme.colors.warningBg, text: theme.colors.warning, label: 'Needs Attention' },
      red: { bg: theme.colors.dangerBg, text: theme.colors.danger, label: 'Behind' },
    };
    return colors[color] || colors.red;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Mentees</Text>
        <Text style={styles.subtitle}>{mentees.length} students assigned</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          testID="mentee-search-input"
          style={styles.searchInput}
          placeholder="Search mentees..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.colors.accent} />}
      >
        {filteredMentees.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No mentees found</Text>
          </View>
        ) : (
          filteredMentees.map((mentee: any) => {
            const badge = getStatusBadge(mentee.progress_summary?.status_color);
            const isExpanded = expandedMentee === mentee.user_id;
            return (
              <View key={mentee.user_id}>
                <TouchableOpacity
                  testID={`mentee-${mentee.user_id}`}
                  style={styles.menteeCard}
                  onPress={() => setExpandedMentee(isExpanded ? null : mentee.user_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menteeAvatar}>
                    {mentee.profile_photo_url ? (
                      <Image source={{ uri: mentee.profile_photo_url }} style={styles.menteeAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={20} color={theme.colors.textInverse} />
                    )}
                  </View>
                  <View style={styles.menteeInfo}>
                    <Text style={styles.menteeName}>{mentee.name}</Text>
                    <Text style={styles.menteeMeta}>{mentee.batch} • {mentee.exam_year}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedView}>
                    <View style={styles.expandedStats}>
                      <View style={styles.expandedStat}>
                        <Text style={styles.expandedStatValue}>{mentee.progress_summary?.avg_completion || 0}%</Text>
                        <Text style={styles.expandedStatLabel}>Completion</Text>
                      </View>
                      <View style={styles.expandedStat}>
                        <Text style={styles.expandedStatValue}>{mentee.progress_summary?.completed || 0}</Text>
                        <Text style={styles.expandedStatLabel}>Done</Text>
                      </View>
                      <View style={styles.expandedStat}>
                        <Text style={styles.expandedStatValue}>{mentee.progress_summary?.in_progress || 0}</Text>
                        <Text style={styles.expandedStatLabel}>Active</Text>
                      </View>
                      <View style={styles.expandedStat}>
                        <Text style={styles.expandedStatValue}>{mentee.progress_summary?.total_hours || 0}h</Text>
                        <Text style={styles.expandedStatLabel}>Hours</Text>
                      </View>
                    </View>
                    <View style={styles.expandedActions}>
                      <TouchableOpacity testID={`view-tracker-${mentee.user_id}`} style={styles.actionBtn}>
                        <Ionicons name="analytics" size={16} color={theme.colors.primary} />
                        <Text style={styles.actionBtnText}>View Tracker</Text>
                      </TouchableOpacity>
                      <TouchableOpacity testID={`add-feedback-${mentee.user_id}`} style={[styles.actionBtn, { backgroundColor: theme.colors.accentLight + '20' }]}>
                        <Ionicons name="chatbox" size={16} color={theme.colors.accentDark} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.accentDark }]}>Feedback</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.expandedDetail}>
                      Pending Tasks: {mentee.pending_tasks || 0} • Optional: {mentee.optional_subject || 'N/A'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
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
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.paper, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 10 },
  menteeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.paper, marginHorizontal: 16, marginBottom: 2, borderRadius: 14, padding: 14, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  menteeAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  menteeAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  menteeInfo: { flex: 1, marginLeft: 12 },
  menteeName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  menteeMeta: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  expandedView: { marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.colors.subtle, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  expandedStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  expandedStat: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 10, padding: 10 },
  expandedStatValue: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  expandedStatLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textTertiary, marginTop: 2 },
  expandedActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.primary + '10', gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  expandedDetail: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center' },
});
