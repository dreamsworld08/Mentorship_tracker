import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { theme } from './theme';

type Props = { syllabus: any[]; onRefresh: () => void; };

export default function SyllabusEditor({ syllabus, onRefresh }: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<{ type: string; parentId: string } | null>(null);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim() || !addingType) return;
    try {
      if (addingType.type === 'stage') await api.createStage({ name: newName.trim() });
      else if (addingType.type === 'paper') await api.createPaper({ stage_id: addingType.parentId, name: newName.trim() });
      else if (addingType.type === 'module') await api.createModule({ paper_id: addingType.parentId, name: newName.trim() });
      else if (addingType.type === 'topic') await api.createTopic({ module_id: addingType.parentId, name: newName.trim() });
      setNewName(''); setAddingType(null); onRefresh();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (type: string, id: string) => {
    try {
      if (type === 'stage') await api.deleteStage(id);
      else if (type === 'paper') await api.deletePaper(id);
      else if (type === 'module') await api.deleteModule(id);
      else if (type === 'topic') await api.deleteTopic(id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const renderInlineAdd = (type: string, parentId: string, placeholder: string) => {
    if (addingType?.type === type && addingType?.parentId === parentId) {
      return (
        <View style={s.addRow}>
          <TextInput style={s.addInput} placeholder={placeholder} placeholderTextColor={theme.colors.textTertiary} value={newName} onChangeText={setNewName} autoFocus />
          <TouchableOpacity style={s.addSave} onPress={handleAdd}><Ionicons name="checkmark" size={16} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={s.addCancel} onPress={() => { setAddingType(null); setNewName(''); }}><Ionicons name="close" size={16} color={theme.colors.textTertiary} /></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity testID={`add-${type}-${parentId}`} style={s.addBtn} onPress={() => { setAddingType({ type, parentId }); setNewName(''); }}>
        <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
        <Text style={s.addBtnText}>Add {type.charAt(0).toUpperCase() + type.slice(1)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {syllabus.map(stage => (
        <View key={stage.stage_id} style={s.stageCard}>
          <TouchableOpacity style={s.stageHeader} onPress={() => setExpandedStage(expandedStage === stage.stage_id ? null : stage.stage_id)}>
            <Ionicons name="layers" size={18} color={theme.colors.primary} />
            <Text style={s.stageName}>{stage.name}</Text>
            <Text style={s.count}>{stage.papers?.length || 0} papers</Text>
            <TouchableOpacity testID={`del-stage-${stage.stage_id}`} onPress={() => handleDelete('stage', stage.stage_id)} style={s.delBtn}><Ionicons name="trash-outline" size={16} color={theme.colors.danger} /></TouchableOpacity>
            <Ionicons name={expandedStage === stage.stage_id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          {expandedStage === stage.stage_id && (
            <View style={s.nested}>
              {stage.papers?.map((paper: any) => (
                <View key={paper.paper_id}>
                  <TouchableOpacity style={s.paperRow} onPress={() => setExpandedPaper(expandedPaper === paper.paper_id ? null : paper.paper_id)}>
                    <Ionicons name="document-text" size={14} color={theme.colors.accent} />
                    <Text style={s.paperName}>{paper.name}</Text>
                    <Text style={s.count}>{paper.modules?.length || 0} modules</Text>
                    <TouchableOpacity testID={`del-paper-${paper.paper_id}`} onPress={() => handleDelete('paper', paper.paper_id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color={theme.colors.danger} /></TouchableOpacity>
                    <Ionicons name={expandedPaper === paper.paper_id ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                  {expandedPaper === paper.paper_id && (
                    <View style={s.nested}>
                      {paper.modules?.map((mod: any) => (
                        <View key={mod.module_id}>
                          <TouchableOpacity style={s.moduleRow} onPress={() => setExpandedModule(expandedModule === mod.module_id ? null : mod.module_id)}>
                            <Text style={s.moduleName}>{mod.name}</Text>
                            <Text style={s.topicBadge}>{mod.topics?.length || 0}</Text>
                            <TouchableOpacity testID={`del-mod-${mod.module_id}`} onPress={() => handleDelete('module', mod.module_id)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color={theme.colors.danger} /></TouchableOpacity>
                          </TouchableOpacity>
                          {expandedModule === mod.module_id && (
                            <View style={s.topicList}>
                              {mod.topics?.map((topic: any) => (
                                <View key={topic.topic_id} style={s.topicRow}>
                                  <Ionicons name="ellipse" size={5} color={theme.colors.textTertiary} />
                                  <Text style={s.topicName}>{topic.name}</Text>
                                  <TouchableOpacity testID={`del-topic-${topic.topic_id}`} onPress={() => handleDelete('topic', topic.topic_id)}><Ionicons name="close-circle" size={16} color={theme.colors.danger} /></TouchableOpacity>
                                </View>
                              ))}
                              {renderInlineAdd('topic', mod.module_id, 'New topic name')}
                            </View>
                          )}
                        </View>
                      ))}
                      {renderInlineAdd('module', paper.paper_id, 'New module name')}
                    </View>
                  )}
                </View>
              ))}
              {renderInlineAdd('paper', stage.stage_id, 'New paper name')}
            </View>
          )}
        </View>
      ))}
      {renderInlineAdd('stage', 'root', 'New stage name')}
    </View>
  );
}

const s = StyleSheet.create({
  stageCard: { backgroundColor: theme.colors.paper, borderRadius: 14, marginBottom: 10, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden' },
  stageHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  stageName: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  count: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '600', marginRight: 4 },
  delBtn: { padding: 4 },
  nested: { paddingLeft: 16, paddingRight: 8, paddingBottom: 8 },
  paperRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: theme.colors.subtle, borderRadius: 8, marginBottom: 4, gap: 6 },
  paperName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  moduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 6 },
  moduleName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  topicBadge: { fontSize: 11, fontWeight: '700', color: theme.colors.accent, backgroundColor: theme.colors.accent + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  topicList: { paddingLeft: 16, paddingBottom: 4 },
  topicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 6 },
  topicName: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  addInput: { flex: 1, backgroundColor: theme.colors.subtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  addSave: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  addCancel: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.subtle, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
});
