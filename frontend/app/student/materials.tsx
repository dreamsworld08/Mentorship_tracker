import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function StudentMaterials() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'announcements'>('docs');
  const [showUpload, setShowUpload] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileDesc, setFileDesc] = useState('');
  const [category, setCategory] = useState('Notes');

  const loadData = async () => {
    try {
      const [docsData, annData] = await Promise.all([api.getDocuments(), api.getAnnouncements()]);
      setDocuments(docsData);
      setAnnouncements(annData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpload = async () => {
    if (!fileName.trim()) return;
    try {
      await api.uploadDocument({ file_name: fileName, category, description: fileDesc, visibility: 'all' });
      setFileName(''); setFileDesc(''); setShowUpload(false);
      loadData();
    } catch (e) { console.error(e); }
  };

  const getCategoryIcon = (cat: string): any => {
    const map: Record<string, string> = { Notes: 'document-text', 'Answer Sheets': 'create', PYQs: 'clipboard', 'Test Papers': 'checkmark-circle', 'Current Affairs': 'newspaper', Essay: 'book', General: 'folder' };
    return map[cat] || 'folder';
  };

  if (loading) return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Materials</Text>
            <Text style={styles.subtitle}>{documents.length} documents available</Text>
          </View>
          <TouchableOpacity testID="upload-doc-btn" style={styles.addBtn} onPress={() => setShowUpload(!showUpload)}>
            <Ionicons name={showUpload ? 'close' : 'cloud-upload'} size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[{ key: 'docs', label: 'Documents' }, { key: 'announcements', label: 'Announcements' }].map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key as any)}>
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
          {showUpload && (
            <View style={styles.uploadCard}>
              <Text style={styles.uploadTitle}>Share a Document</Text>
              <TextInput testID="doc-name-input" style={styles.input} placeholder="Document name" placeholderTextColor={theme.colors.textTertiary} value={fileName} onChangeText={setFileName} />
              <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={theme.colors.textTertiary} value={fileDesc} onChangeText={setFileDesc} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
                {['Notes', 'Answer Sheets', 'PYQs', 'Test Papers', 'Current Affairs', 'Essay'].map(c => (
                  <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
                    <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity testID="submit-doc-btn" style={styles.submitBtn} onPress={handleUpload}>
                <Text style={styles.submitBtnText}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'docs' ? (
            <View style={styles.section}>
              {documents.length === 0 ? (
                <View style={styles.emptyState}><Ionicons name="folder-open-outline" size={40} color={theme.colors.textTertiary} /><Text style={styles.emptyText}>No documents shared yet</Text></View>
              ) : (
                documents.map(doc => (
                  <View key={doc.doc_id} style={styles.docCard} testID={`doc-${doc.doc_id}`}>
                    <View style={[styles.docIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                      <Ionicons name={getCategoryIcon(doc.category)} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.docInfo}>
                      <View style={styles.docRow}>
                        <Text style={styles.docName}>{doc.file_name}</Text>
                        {doc.is_pinned && <Ionicons name="pin" size={14} color={theme.colors.accent} />}
                      </View>
                      <Text style={styles.docMeta}>{doc.category} • {doc.uploader?.name || 'Unknown'} • {new Date(doc.created_at).toLocaleDateString()}</Text>
                      {doc.description ? <Text style={styles.docDesc} numberOfLines={1}>{doc.description}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.section}>
              {announcements.map(ann => (
                <View key={ann.announcement_id} style={styles.annCard}>
                  <Ionicons name="megaphone" size={16} color={theme.colors.accent} />
                  <View style={styles.annContent}>
                    <Text style={styles.annTitle}>{ann.title}</Text>
                    <Text style={styles.annBody} numberOfLines={3}>{ann.body}</Text>
                    <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
                  </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.subtle, borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.paper },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textTertiary },
  tabTextActive: { color: theme.colors.primary },
  section: { paddingHorizontal: 16 },
  uploadCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.paper, borderRadius: 16, padding: 16, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  input: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.subtle, borderWidth: 1, borderColor: theme.colors.border },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  catChipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: theme.colors.paper, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderLight },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 10 },
  docCard: { flexDirection: 'row', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, gap: 12 },
  docIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
  docMeta: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  docDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  annCard: { flexDirection: 'row', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, marginBottom: 8, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, gap: 10 },
  annContent: { flex: 1 },
  annTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  annBody: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  annDate: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },
});
