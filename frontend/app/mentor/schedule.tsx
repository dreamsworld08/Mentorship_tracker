import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function MentorSchedule() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'syllabus'>('sessions');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [addingToModule, setAddingToModule] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sessData, syllData] = await Promise.all([api.getSessions(), api.getSyllabus()]);
      setSessions(sessData); setSyllabus(syllData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddTopic = async (moduleId: string) => {
    if (!newTopicName.trim()) return;
    try {
      await api.createTopic({ module_id: moduleId, name: newTopicName.trim() });
      setNewTopicName(''); setAddingToModule(null);
      const syllData = await api.getSyllabus();
      setSyllabus(syllData);
    } catch (e) { console.error(e); }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await api.deleteTopic(topicId);
      const syllData = await api.getSyllabus();
      setSyllabus(syllData);
    } catch (e) { console.error(e); }
  };

  if (loading) return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></SafeAreaView>;

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>{activeTab === 'sessions' ? 'Schedule' : 'Syllabus Manager'}</Text>
          <Text style={styles.subtitle}>{activeTab === 'sessions' ? 'Manage sessions' : 'Add/remove topics'}</Text>
        </View>
        <View style={styles.tabs}>
          {[{ key: 'sessions', label: 'Sessions' }, { key: 'syllabus', label: 'Syllabus' }].map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key as any)}>
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
          {activeTab === 'sessions' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming ({upcoming.length})</Text>
                {upcoming.length === 0 ? (
                  <View style={styles.emptyState}><Ionicons name="calendar-outline" size={36} color={theme.colors.textTertiary} /><Text style={styles.emptyText}>No upcoming sessions</Text></View>
                ) : upcoming.map(s => (
                  <View key={s.session_id} style={styles.sessionCard} testID={`session-${s.session_id}`}>
                    <View style={[styles.sessionDot, { backgroundColor: theme.colors.accent }]} />
                    <View style={styles.sessionContent}>
                      <Text style={styles.sessionStudent}>{s.student?.name || 'Student'}</Text>
                      <Text style={styles.sessionTime}>{new Date(s.scheduled_at).toLocaleString()}</Text>
                      <Text style={styles.sessionAgenda}>{s.agenda || 'No agenda'}</Text>
                    </View>
                    <View style={styles.sessionDuration}><Text style={styles.durationText}>{s.duration_minutes}m</Text></View>
                  </View>
                ))}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past ({past.length})</Text>
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
            </>
          ) : (
            <View style={styles.section}>
              {syllabus.map(stage => (
                <View key={stage.stage_id} style={styles.stageCard}>
                  <TouchableOpacity style={styles.stageHeader} onPress={() => setExpandedStage(expandedStage === stage.stage_id ? null : stage.stage_id)}>
                    <Ionicons name="layers" size={18} color={theme.colors.primary} />
                    <Text style={styles.stageName}>{stage.name}</Text>
                    <Ionicons name={expandedStage === stage.stage_id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                  {expandedStage === stage.stage_id && stage.papers?.map((paper: any) => (
                    <View key={paper.paper_id}>
                      <TouchableOpacity style={styles.paperRow} onPress={() => setExpandedPaper(expandedPaper === paper.paper_id ? null : paper.paper_id)}>
                        <Ionicons name="document-text" size={14} color={theme.colors.accent} />
                        <Text style={styles.paperName}>{paper.name}</Text>
                        <Ionicons name={expandedPaper === paper.paper_id ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
                      </TouchableOpacity>
                      {expandedPaper === paper.paper_id && paper.modules?.map((mod: any) => (
                        <View key={mod.module_id}>
                          <TouchableOpacity style={styles.moduleRow} onPress={() => setExpandedModule(expandedModule === mod.module_id ? null : mod.module_id)}>
                            <Text style={styles.moduleName}>{mod.name}</Text>
                            <Text style={styles.topicCount}>{mod.topics?.length || 0}</Text>
                          </TouchableOpacity>
                          {expandedModule === mod.module_id && (
                            <View style={styles.topicsList}>
                              {mod.topics?.map((topic: any) => (
                                <View key={topic.topic_id} style={styles.topicRow}>
                                  <Ionicons name="ellipse" size={6} color={theme.colors.textTertiary} />
                                  <Text style={styles.topicName}>{topic.name}</Text>
                                  <TouchableOpacity testID={`delete-topic-${topic.topic_id}`} onPress={() => handleDeleteTopic(topic.topic_id)} style={styles.topicDeleteBtn}>
                                    <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                              {addingToModule === mod.module_id ? (
                                <View style={styles.addTopicRow}>
                                  <TextInput style={styles.addTopicInput} placeholder="Topic name" placeholderTextColor={theme.colors.textTertiary} value={newTopicName} onChangeText={setNewTopicName} autoFocus />
                                  <TouchableOpacity testID={`save-topic-${mod.module_id}`} style={styles.addTopicSave} onPress={() => handleAddTopic(mod.module_id)}>
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.addTopicCancel} onPress={() => { setAddingToModule(null); setNewTopicName(''); }}>
                                    <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity testID={`add-topic-to-${mod.module_id}`} style={styles.addTopicBtn} onPress={() => setAddingToModule(mod.module_id)}>
                                  <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
                                  <Text style={styles.addTopicBtnText}>Add Topic</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
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
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.subtle, borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.paper },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textTertiary },
  tabTextActive: { color: theme.colors.primary },
  section: { paddingHorizontal: 16, marginTop: 8 },
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
  // Syllabus
  stageCard: { backgroundColor: theme.colors.paper, borderRadius: 14, marginBottom: 10, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden' },
  stageHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  stageName: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  paperRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.subtle, gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  paperName: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  moduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  moduleName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  topicCount: { fontSize: 12, fontWeight: '700', color: theme.colors.accent, backgroundColor: theme.colors.accent + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  topicsList: { paddingLeft: 28, paddingRight: 14, paddingBottom: 8 },
  topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  topicName: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  topicDeleteBtn: { padding: 2 },
  addTopicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addTopicInput: { flex: 1, backgroundColor: theme.colors.subtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  addTopicSave: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  addTopicCancel: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.subtle, justifyContent: 'center', alignItems: 'center' },
  addTopicBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addTopicBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
});
