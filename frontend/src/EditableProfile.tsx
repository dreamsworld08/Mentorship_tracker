import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from './api';
import { theme } from './theme';

type Props = {
  user: any;
  onUpdate: () => void;
};

export default function EditableProfile({ user, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.updateUser(user.user_id, { name: name.trim(), phone: phone.trim() });
      setEditing(false);
      onUpdate();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={36} color={theme.colors.textInverse} />
          )}
        </View>
        {editing && (
          <TouchableOpacity testID="change-photo-btn" style={styles.editPhotoBtn}>
            <Ionicons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View style={styles.editForm}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput testID="edit-name-input" style={styles.editInput} value={name} onChangeText={setName} placeholder="Full Name" placeholderTextColor={theme.colors.textTertiary} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={[styles.editInput, styles.disabledInput]} value={email} editable={false} />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput testID="edit-phone-input" style={styles.editInput} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" />
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setName(user.name); setPhone(user.phone || ''); setError(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="save-profile-btn" style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.phone && <Text style={styles.phone}>{user.phone}</Text>}
          <TouchableOpacity testID="edit-profile-btn" style={styles.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', backgroundColor: theme.colors.paper, marginHorizontal: 16, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 20, marginTop: 8, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  editPhotoBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  phone: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.primary + '10', gap: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  editForm: { width: '100%', marginTop: 4 },
  errorText: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, backgroundColor: theme.colors.dangerBg, padding: 8, borderRadius: 8, textAlign: 'center' },
  fieldRow: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  editInput: { backgroundColor: theme.colors.subtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border },
  disabledInput: { opacity: 0.6 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
