import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Image, KeyboardAvoidingView, Platform,
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
  const [viewingTracker, setViewingTracker] = useState<string | null>(null);
  const [trackerData, setTrackerData] = useState<any>(null);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [feedbackMentee, setFeedbackMentee] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskTarget, setTaskTarget] = useState<'single' | 'batch' | 'all'>('single');
  const [taskStudentId, setTaskStudentId] = useState('');
  const [batches, setBatches] = useState<string[]>([]);
  const [taskBatch, setTaskBatch] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const [data, batchData] = await Promise.all([api.getMentees(user.user_id), api.getBatches()]);
      setMentees(data); setBatches(batchData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleViewTracker = async (studentId: string) => {
    if (viewingTracker === studentId) { setViewingTracker(null); return; }
    setTrackerLoading(true); setViewingTracker(studentId);
    try {
      const data = await api.getTrackerSummary(studentId);
      setTrackerData(data);
    } catch (e) { console.error(e); }
    finally { setTrackerLoading(false); }
  };

  const handleSendFeedback = async (studentId: string) => {
    if (!feedbackText.trim()) return;
    try {
      await api.createFeedback({ student_id: studentId, feedback: feedbackText.trim() });
      setFeedbackText(''); setFeedbackMentee(null);
    } catch (e) { console.error(e); }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    try {
      await api.createTask({
        title: taskTitle, description: taskDesc, due_date: taskDue || undefined,
        assigned_to: taskTarget === 'single' ? taskStudentId : undefined,
        broadcast: taskTarget !== 'single',
        target_batch: taskTarget === 'batch' ? taskBatch : undefined,
      });
      setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowTaskForm(false);
      setTaskStudentId(''); setTaskTarget('single');
    } catch (e) { console.error(e); }
  };

  const filteredMentees = mentees.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));
  const getStatusBadge = (color: string) => {
    const c: Record<string, any> = { green: { bg: theme.colors.successBg, text: theme.colors.success, label: 'On Track' }, yellow: { bg: theme.colors.warningBg, text: theme.colors.warning, label: 'Needs Attention' }, red: { bg: theme.colors.dangerBg, text: theme.colors.danger, label: 'Behind' } };
    return c[color] || c.red;
  };

  if (loading) return <SafeAreaView style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View><Text style={s.title}>My Mentees</Text><Text style={s.subtitle}>{mentees.length} students</Text></View>
          <TouchableOpacity testID="assign-task-btn" style={s.addBtn} onPress={() => setShowTaskForm(!showTaskForm)}>
            <Ionicons name={showTaskForm ? 'close' : 'clipboard'} size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
        <View style={s.searchRow}><Ionicons name="search" size={18} color={theme.colors.textTertiary} /><TextInput testID="mentee-search-input" style={s.searchInput} placeholder="Search mentees..." placeholderTextColor={theme.colors.textTertiary} value={search} onChangeText={setSearch} /></View>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
          {/* Task Assignment Form */}
          {showTaskForm && (
            <View style={s.taskForm}>
              <Text style={s.formTitle}>Assign Task</Text>
              <View style={s.targetRow}>
                {[{ key: 'single', label: 'Single Student' }, { key: 'batch', label: 'Batch' }, { key: 'all', label: 'All Mentees' }].map(t => (
                  <TouchableOpacity key={t.key} style={[s.targetBtn, taskTarget === t.key && s.targetBtnActive]} onPress={() => setTaskTarget(t.key as any)}>
                    <Text style={[s.targetBtnText, taskTarget === t.key && s.targetBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {taskTarget === 'single' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                  {mentees.map(m => (
                    <TouchableOpacity key={m.user_id} style={[s.chipBtn, taskStudentId === m.user_id && s.chipBtnActive]} onPress={() => setTaskStudentId(m.user_id)}>
                      <Text style={[s.chipBtnText, taskStudentId === m.user_id && s.chipBtnTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {taskTarget === 'batch' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                  {batches.map(b => (
                    <TouchableOpacity key={b} style={[s.chipBtn, taskBatch === b && s.chipBtnActive]} onPress={() => setTaskBatch(b)}>
                      <Text style={[s.chipBtnText, taskBatch === b && s.chipBtnTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TextInput style={s.input} placeholder="Task title *" placeholderTextColor={theme.colors.textTertiary} value={taskTitle} onChangeText={setTaskTitle} />
              <TextInput style={s.input} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} value={taskDesc} onChangeText={setTaskDesc} />
              <TextInput style={s.input} placeholder="Due date (YYYY-MM-DD)" placeholderTextColor={theme.colors.textTertiary} value={taskDue} onChangeText={setTaskDue} />
              <TouchableOpacity testID="submit-task-btn" style={s.submitBtn} onPress={handleCreateTask}><Text style={s.submitBtnText}>Assign Task</Text></TouchableOpacity>
            </View>
          )}

          {filteredMentees.map(mentee => {
            const badge = getStatusBadge(mentee.progress_summary?.status_color);
            const isExpanded = expandedMentee === mentee.user_id;
            return (
              <View key={mentee.user_id}>
                <TouchableOpacity testID={`mentee-${mentee.user_id}`} style={s.menteeCard} onPress={() => setExpandedMentee(isExpanded ? null : mentee.user_id)} activeOpacity={0.7}>
                  <View style={s.menteeAvatar}>{mentee.profile_photo_url ? <Image source={{ uri: mentee.profile_photo_url }} style={s.menteeAvatarImg} /> : <Ionicons name="person" size={20} color={theme.colors.textInverse} />}</View>
                  <View style={s.menteeInfo}><Text style={s.menteeName}>{mentee.name}</Text><Text style={s.menteeMeta}>{mentee.batch} • {mentee.exam_year}</Text></View>
                  <View style={[s.statusBadge, { backgroundColor: badge.bg }]}><Text style={[s.statusText, { color: badge.text }]}>{badge.label}</Text></View>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={s.expandedView}>
                    <View style={s.expandedStats}>
                      {[{ v: `${mentee.progress_summary?.avg_completion || 0}%`, l: 'Completion' }, { v: mentee.progress_summary?.completed || 0, l: 'Done' }, { v: mentee.progress_summary?.in_progress || 0, l: 'Active' }, { v: `${mentee.progress_summary?.total_hours || 0}h`, l: 'Hours' }].map((st, i) => (
                        <View key={i} style={s.expandedStat}><Text style={s.expandedStatValue}>{st.v}</Text><Text style={s.expandedStatLabel}>{st.l}</Text></View>
                      ))}
                    </View>
                    <View style={s.expandedActions}>
                      <TouchableOpacity testID={`view-tracker-${mentee.user_id}`} style={s.actionBtn} onPress={() => handleViewTracker(mentee.user_id)}>
                        <Ionicons name="analytics" size={16} color={theme.colors.primary} /><Text style={s.actionBtnText}>{viewingTracker === mentee.user_id ? 'Hide' : 'View'} Tracker</Text>
                      </TouchableOpacity>
                      <TouchableOpacity testID={`add-feedback-${mentee.user_id}`} style={[s.actionBtn, { backgroundColor: theme.colors.accentLight + '20' }]} onPress={() => setFeedbackMentee(feedbackMentee === mentee.user_id ? null : mentee.user_id)}>
                        <Ionicons name="chatbox" size={16} color={theme.colors.accentDark} /><Text style={[s.actionBtnText, { color: theme.colors.accentDark }]}>Feedback</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Tracker View */}
                    {viewingTracker === mentee.user_id && (
                      <View style={s.trackerView}>
                        {trackerLoading ? <ActivityIndicator color={theme.colors.primary} /> : trackerData && (
                          <>
                            <Text style={s.trackerTitle}>Progress: {trackerData.completed}/{trackerData.total_topics} topics ({Math.round(trackerData.completed / trackerData.total_topics * 100)}%)</Text>
                            {trackerData.stage_progress?.map((sp: any) => (
                              <View key={sp.stage_id} style={s.stageRow}>
                                <Text style={s.stageLabel}>{sp.name}</Text>
                                <View style={s.stageBarBg}><View style={[s.stageBarFill, { width: `${sp.pct}%` }]} /></View>
                                <Text style={s.stagePct}>{sp.pct}%</Text>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    )}
                    {/* Feedback Box */}
                    {feedbackMentee === mentee.user_id && (
                      <View style={s.feedbackBox}>
                        <TextInput testID={`feedback-input-${mentee.user_id}`} style={s.feedbackInput} placeholder="Write feedback for this student..." placeholderTextColor={theme.colors.textTertiary} value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={3} />
                        <TouchableOpacity testID={`send-feedback-${mentee.user_id}`} style={s.feedbackSendBtn} onPress={() => handleSendFeedback(mentee.user_id)}>
                          <Ionicons name="send" size={16} color="#fff" /><Text style={s.feedbackSendText}>Send</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={s.expandedDetail}>Pending: {mentee.pending_tasks || 0} tasks • Optional: {mentee.optional_subject || 'N/A'}</Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.paper, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  // Task form
  taskForm: { marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  formTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  targetRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  targetBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center' },
  targetBtnActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '10' },
  targetBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textTertiary },
  targetBtnTextActive: { color: theme.colors.accentDark },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.subtle, borderWidth: 1, borderColor: theme.colors.border },
  chipBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipBtnTextActive: { color: '#fff' },
  input: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  submitBtn: { backgroundColor: theme.colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Mentee cards
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
  expandedDetail: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 4 },
  // Tracker view
  trackerView: { backgroundColor: theme.colors.paper, borderRadius: 10, padding: 12, marginBottom: 8 },
  trackerTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, marginBottom: 8 },
  stageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  stageLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, width: 80 },
  stageBarBg: { flex: 1, height: 6, backgroundColor: theme.colors.subtle, borderRadius: 3 },
  stageBarFill: { height: 6, backgroundColor: theme.colors.accent, borderRadius: 3 },
  stagePct: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, width: 35, textAlign: 'right' },
  // Feedback
  feedbackBox: { backgroundColor: theme.colors.paper, borderRadius: 10, padding: 12, marginBottom: 8 },
  feedbackInput: { backgroundColor: theme.colors.subtle, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, minHeight: 70, textAlignVertical: 'top', marginBottom: 8 },
  feedbackSendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderRadius: 10, paddingVertical: 10, gap: 6 },
  feedbackSendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
