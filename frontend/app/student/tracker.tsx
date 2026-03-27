import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function StudentTracker() {
  const { user } = useAuth();
  const [tracker, setTracker] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.getTracker(user.user_id);
      setTracker(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Tracker</Text>
        <Text style={styles.subtitle}>Track your UPSC preparation progress</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {tracker.map((stage: any) => (
          <View key={stage.stage_id} style={styles.stageContainer}>
            <TouchableOpacity
              testID={`stage-${stage.stage_id}`}
              style={styles.stageHeader}
              onPress={() => setExpandedStage(expandedStage === stage.stage_id ? null : stage.stage_id)}
              activeOpacity={0.7}
            >
              <View style={styles.stageLeft}>
                <View style={[styles.stageIcon, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="layers" size={18} color={theme.colors.textInverse} />
                </View>
                <View>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <Text style={styles.stageCompletion}>{stage.completion?.pct || 0}% complete</Text>
                </View>
              </View>
              <View style={styles.stageRight}>
                <View style={styles.miniProgressBg}>
                  <View style={[styles.miniProgressFill, { width: `${stage.completion?.pct || 0}%` }]} />
                </View>
                <Ionicons
                  name={expandedStage === stage.stage_id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

            {expandedStage === stage.stage_id && stage.papers?.map((paper: any) => (
              <View key={paper.paper_id} style={styles.paperContainer}>
                <TouchableOpacity
                  testID={`paper-${paper.paper_id}`}
                  style={styles.paperHeader}
                  onPress={() => setExpandedPaper(expandedPaper === paper.paper_id ? null : paper.paper_id)}
                >
                  <View style={styles.paperLeft}>
                    <Ionicons name="document-text" size={16} color={theme.colors.accent} />
                    <Text style={styles.paperName}>{paper.name}</Text>
                  </View>
                  <Text style={styles.paperPct}>{paper.completion?.pct || 0}%</Text>
                </TouchableOpacity>

                {expandedPaper === paper.paper_id && paper.modules?.map((module: any) => (
                  <View key={module.module_id} style={styles.moduleContainer}>
                    <TouchableOpacity
                      style={styles.moduleHeader}
                      onPress={() => setExpandedModule(expandedModule === module.module_id ? null : module.module_id)}
                    >
                      <Text style={styles.moduleName}>{module.name}</Text>
                      <Text style={styles.moduleCount}>{module.topics?.length || 0} topics</Text>
                    </TouchableOpacity>

                    {expandedModule === module.module_id && module.topics?.map((topic: any) => (
                      <View key={topic.topic_id} style={styles.topicRow}>
                        <Ionicons
                          name={getStatusIcon(topic.progress?.status)}
                          size={18}
                          color={getStatusColor(topic.progress?.status)}
                        />
                        <View style={styles.topicContent}>
                          <Text style={styles.topicName}>{topic.name}</Text>
                          <View style={styles.topicMeta}>
                            <Text style={[styles.topicStatus, { color: getStatusColor(topic.progress?.status) }]}>
                              {(topic.progress?.status || 'not_started').replace('_', ' ')}
                            </Text>
                            {topic.progress?.study_hours > 0 && (
                              <Text style={styles.topicHours}>{topic.progress.study_hours}h</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.topicPct}>{topic.progress?.completion_pct || 0}%</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  stageContainer: { marginHorizontal: 16, marginTop: 12 },
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
  topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 10 },
  topicContent: { flex: 1 },
  topicName: { fontSize: 13, fontWeight: '500', color: theme.colors.textPrimary },
  topicMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  topicStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  topicHours: { fontSize: 11, color: theme.colors.textTertiary },
  topicPct: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
});
