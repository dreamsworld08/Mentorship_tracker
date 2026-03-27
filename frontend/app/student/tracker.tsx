import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

const STATUS_CYCLE = ['not_started', 'in_progress', 'revision', 'completed'];

export default function StudentTracker() {
  const { user } = useAuth();
  const [tracker, setTracker] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.getTracker(user.user_id);
      setTracker(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'in_progress': return theme.colors.warning;
      case 'revision': return theme.colors.primaryLight;
      default: return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in_progress': return 'time';
      case 'revision': return 'refresh-circle';
      default: return 'ellipse-outline';
    }
  };

  const handleToggleStatus = async (topicId: string, currentStatus: string) => {
    if (!user) return;
    setUpdating(topicId);
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus || 'not_started');
    const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIdx];
    const completionPct = nextStatus === 'completed' ? 100 : (nextStatus === 'revision' ? 80 : (nextStatus === 'in_progress' ? 30 : 0));
    try {
      await api.updateTracker(user.user_id, topicId, { status: nextStatus, completion_pct: completionPct });
      // Update local state immediately for responsiveness
      setTracker(prev => prev.map(stage => ({
        ...stage,
        papers: stage.papers?.map((paper: any) => ({
          ...paper,
          modules: paper.modules?.map((mod: any) => ({
            ...mod,
            topics: mod.topics?.map((t: any) =>
              t.topic_id === topicId ? { ...t, progress: { ...t.progress, status: nextStatus, completion_pct: completionPct } } : t
            )
          }))
        }))
      })));
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  const handleSaveHours = async (topicId: string) => {
    if (!user || !editHours) return;
    try {
      await api.updateTracker(user.user_id, topicId, { study_hours: parseFloat(editHours) });
      setEditingTopic(null); setEditHours('');
      loadData();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <SafeAreaView style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Study Tracker</Text>
        <Text style={s.subtitle}>Tap status icon to update progress</Text>
      </View>
      {/* Legend */}
      <View style={s.legend}>
        {[{ status: 'not_started', label: 'Not Started' }, { status: 'in_progress', label: 'In Progress' }, { status: 'revision', label: 'Revision' }, { status: 'completed', label: 'Done' }].map(item => (
          <View key={item.status} style={s.legendItem}>
            <Ionicons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
            <Text style={[s.legendText, { color: getStatusColor(item.status) }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.colors.primary} />}>
        {tracker.map((stage: any) => (
          <View key={stage.stage_id} style={s.stageContainer}>
            <TouchableOpacity testID={`stage-${stage.stage_id}`} style={s.stageHeader} onPress={() => setExpandedStage(expandedStage === stage.stage_id ? null : stage.stage_id)} activeOpacity={0.7}>
              <View style={s.stageLeft}>
                <View style={[s.stageIcon, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="layers" size={18} color={theme.colors.textInverse} />
                </View>
                <View>
                  <Text style={s.stageName}>{stage.name}</Text>
                  <Text style={s.stageCompletion}>{stage.completion?.pct || 0}% complete</Text>
                </View>
              </View>
              <View style={s.stageRight}>
                <View style={s.miniProgressBg}><View style={[s.miniProgressFill, { width: `${stage.completion?.pct || 0}%` }]} /></View>
                <Ionicons name={expandedStage === stage.stage_id ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textTertiary} />
              </View>
            </TouchableOpacity>

            {expandedStage === stage.stage_id && stage.papers?.map((paper: any) => (
              <View key={paper.paper_id} style={s.paperContainer}>
                <TouchableOpacity testID={`paper-${paper.paper_id}`} style={s.paperHeader} onPress={() => setExpandedPaper(expandedPaper === paper.paper_id ? null : paper.paper_id)}>
                  <View style={s.paperLeft}><Ionicons name="document-text" size={16} color={theme.colors.accent} /><Text style={s.paperName}>{paper.name}</Text></View>
                  <Text style={s.paperPct}>{paper.completion?.pct || 0}%</Text>
                </TouchableOpacity>

                {expandedPaper === paper.paper_id && paper.modules?.map((module: any) => (
                  <View key={module.module_id} style={s.moduleContainer}>
                    <TouchableOpacity style={s.moduleHeader} onPress={() => setExpandedModule(expandedModule === module.module_id ? null : module.module_id)}>
                      <Text style={s.moduleName}>{module.name}</Text>
                      <Text style={s.moduleCount}>{module.topics?.length || 0} topics</Text>
                    </TouchableOpacity>

                    {expandedModule === module.module_id && module.topics?.map((topic: any) => (
                      <View key={topic.topic_id}>
                        <View style={s.topicRow}>
                          {/* Tappable status icon */}
                          <TouchableOpacity
                            testID={`toggle-${topic.topic_id}`}
                            style={s.statusBtn}
                            onPress={() => handleToggleStatus(topic.topic_id, topic.progress?.status)}
                            activeOpacity={0.6}
                          >
                            {updating === topic.topic_id ? (
                              <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                              <Ionicons name={getStatusIcon(topic.progress?.status)} size={22} color={getStatusColor(topic.progress?.status)} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity style={s.topicContent} onPress={() => setEditingTopic(editingTopic === topic.topic_id ? null : topic.topic_id)}>
                            <Text style={s.topicName}>{topic.name}</Text>
                            <View style={s.topicMeta}>
                              <Text style={[s.topicStatus, { color: getStatusColor(topic.progress?.status) }]}>
                                {(topic.progress?.status || 'not_started').replace('_', ' ')}
                              </Text>
                              {topic.progress?.study_hours > 0 && <Text style={s.topicHours}>{topic.progress.study_hours}h</Text>}
                            </View>
                          </TouchableOpacity>
                          <Text style={s.topicPct}>{topic.progress?.completion_pct || 0}%</Text>
                        </View>
                        {/* Edit panel */}
                        {editingTopic === topic.topic_id && (
                          <View style={s.editPanel}>
                            <View style={s.editRow}>
                              <Text style={s.editLabel}>Log hours:</Text>
                              <TextInput
                                testID={`hours-${topic.topic_id}`}
                                style={s.editInput}
                                placeholder="0"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={editHours}
                                onChangeText={setEditHours}
                                keyboardType="numeric"
                              />
                              <TouchableOpacity testID={`save-hours-${topic.topic_id}`} style={s.editSaveBtn} onPress={() => handleSaveHours(topic.topic_id)}>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              </TouchableOpacity>
                            </View>
                            <View style={s.statusRow}>
                              {STATUS_CYCLE.map(st => (
                                <TouchableOpacity
                                  key={st}
                                  testID={`set-status-${st}-${topic.topic_id}`}
                                  style={[s.statusChip, topic.progress?.status === st && { backgroundColor: getStatusColor(st), borderColor: getStatusColor(st) }]}
                                  onPress={() => handleToggleStatus(topic.topic_id, STATUS_CYCLE[(STATUS_CYCLE.indexOf(st) - 1 + STATUS_CYCLE.length) % STATUS_CYCLE.length])}
                                >
                                  <Text style={[s.statusChipText, topic.progress?.status === st && { color: '#fff' }]}>{st.replace('_', ' ')}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  legend: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
  stageContainer: { marginHorizontal: 16, marginTop: 8 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 14, padding: 14, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  stageLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stageName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  stageCompletion: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  stageRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniProgressBg: { width: 50, height: 4, backgroundColor: theme.colors.subtle, borderRadius: 2 },
  miniProgressFill: { height: 4, backgroundColor: theme.colors.accent, borderRadius: 2 },
  paperContainer: { marginLeft: 20, marginTop: 6 },
  paperHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.paper, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.borderLight },
  paperLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paperName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  paperPct: { fontSize: 13, fontWeight: '700', color: theme.colors.accent },
  moduleContainer: { marginLeft: 16, marginTop: 4 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.colors.subtle, borderRadius: 8 },
  moduleName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  moduleCount: { fontSize: 12, color: theme.colors.textTertiary },
  topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 6 },
  statusBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.subtle },
  topicContent: { flex: 1 },
  topicName: { fontSize: 13, fontWeight: '500', color: theme.colors.textPrimary },
  topicMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  topicStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  topicHours: { fontSize: 11, color: theme.colors.textTertiary },
  topicPct: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, width: 36, textAlign: 'right' },
  // Edit panel
  editPanel: { backgroundColor: theme.colors.subtle, borderRadius: 8, padding: 10, marginHorizontal: 8, marginBottom: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  editLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  editInput: { flex: 1, backgroundColor: theme.colors.paper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  editSaveBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  statusRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.paper },
  statusChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
});
