import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function StudentMaterials() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
        <Text style={styles.title}>Materials & Resources</Text>
        <Text style={styles.subtitle}>Study materials and announcements</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.colors.primary} />}
      >
        {/* Announcements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          {announcements.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          ) : (
            announcements.map((ann: any) => (
              <View key={ann.announcement_id} style={styles.card} testID={`announcement-${ann.announcement_id}`}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="megaphone" size={16} color={theme.colors.accent} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{ann.title}</Text>
                    <Text style={styles.cardDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text style={styles.cardBody}>{ann.body}</Text>
                {ann.creator && <Text style={styles.cardCreator}>By {ann.creator.name}</Text>}
              </View>
            ))
          )}
        </View>

        {/* Quick Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Resources</Text>
          <View style={styles.resourceGrid}>
            {[
              { icon: 'library', label: 'NCERT Notes', color: theme.colors.primary },
              { icon: 'newspaper', label: 'Current Affairs', color: theme.colors.accent },
              { icon: 'create', label: 'Answer Writing', color: theme.colors.success },
              { icon: 'clipboard', label: 'PYQ Papers', color: theme.colors.warning },
            ].map((item, idx) => (
              <View key={idx} style={styles.resourceCard}>
                <View style={[styles.resourceIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={styles.resourceLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
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
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: theme.colors.paper, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderLight },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 10 },
  card: { backgroundColor: theme.colors.paper, borderRadius: 14, padding: 16, marginBottom: 10, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.accentLight + '30', justifyContent: 'center', alignItems: 'center' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  cardDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  cardBody: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  cardCreator: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 8, fontStyle: 'italic' },
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resourceCard: { width: '48%', backgroundColor: theme.colors.paper, borderRadius: 14, padding: 16, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  resourceIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  resourceLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center' },
});
