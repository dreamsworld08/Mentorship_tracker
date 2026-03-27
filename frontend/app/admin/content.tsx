import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function AdminContent() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const loadData = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      await api.createAnnouncement({ title, body });
      setTitle('');
      setBody('');
      setShowForm(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Content Management</Text>
          <Text style={styles.subtitle}>Manage announcements & materials</Text>
        </View>
        <TouchableOpacity testID="new-announcement-btn" style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Announcement</Text>
            <TextInput
              testID="announcement-title-input"
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={theme.colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              testID="announcement-body-input"
              style={[styles.input, styles.textArea]}
              placeholder="Body"
              placeholderTextColor={theme.colors.textTertiary}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity testID="submit-announcement-btn" style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Publish Announcement</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements ({announcements.length})</Text>
          {announcements.map((ann: any) => (
            <View key={ann.announcement_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="megaphone" size={16} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>{ann.title}</Text>
              </View>
              <Text style={styles.cardBody}>{ann.body}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
                {ann.creator && <Text style={styles.cardCreator}>by {ann.creator.name}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Syllabus Quick View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'people-circle', label: 'Manage Users', color: theme.colors.primary },
              { icon: 'git-branch', label: 'Syllabus Config', color: theme.colors.accent },
              { icon: 'cloud-upload', label: 'Bulk Import', color: theme.colors.success },
              { icon: 'analytics', label: 'Reports', color: theme.colors.warning },
            ].map((action, idx) => (
              <TouchableOpacity key={idx} style={styles.actionCard}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  formCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  formTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  input: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  card: { backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
  cardBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardDate: { fontSize: 11, color: theme.colors.textTertiary },
  cardCreator: { fontSize: 11, color: theme.colors.textTertiary, fontStyle: 'italic' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', backgroundColor: theme.colors.paper, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  actionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
});
