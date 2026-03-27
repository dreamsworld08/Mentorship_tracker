import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/AuthContext';
import { theme } from '../../src/theme';
import EditableProfile from '../../src/EditableProfile';

export default function MentorProfile() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => { await logout(); router.replace('/'); };
  const confirmLogout = () => { if (Platform.OS === 'web') { setShowLogoutConfirm(true); } else { const Alert = require('react-native').Alert; Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: handleLogout }]); } };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.title}>Profile</Text></View>
        <EditableProfile user={user} onUpdate={refreshUser} />
        <View style={styles.roleBadgeRow}><View style={styles.roleBadge}><Text style={styles.roleText}>Mentor</Text></View></View>
        <View style={styles.section}>
          <View style={styles.detailCard}>
            {[{ icon: 'people', label: 'Mentees', value: `${user?.mentee_count || 0} students` }, { icon: 'school', label: 'Course', value: user?.course || 'N/A' }].map((item, idx) => (
              <View key={idx} style={[styles.detailRow, idx < 1 && styles.detailRowBorder]}>
                <View style={styles.detailLeft}><Ionicons name={item.icon as any} size={18} color={theme.colors.textTertiary} /><Text style={styles.detailLabel}>{item.label}</Text></View>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <TouchableOpacity testID="mentor-logout-button" style={styles.logoutBtn} onPress={confirmLogout}><Ionicons name="log-out-outline" size={20} color={theme.colors.danger} /><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}><View style={styles.modalCard}><Text style={styles.modalTitle}>Logout</Text><Text style={styles.modalBody}>Are you sure?</Text>
          <View style={styles.modalActions}><TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutConfirm(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}><Text style={styles.modalLogoutText}>Logout</Text></TouchableOpacity></View></View></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  roleBadgeRow: { alignItems: 'center', marginTop: 8 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.colors.accent + '20' },
  roleText: { fontSize: 12, fontWeight: '700', color: theme.colors.accentDark },
  section: { paddingHorizontal: 20, marginTop: 20 },
  detailCard: { backgroundColor: theme.colors.paper, borderRadius: 14, padding: 4, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: theme.colors.dangerBg, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: theme.colors.danger },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { backgroundColor: theme.colors.paper, borderRadius: 20, padding: 24, width: '80%', maxWidth: 340, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 8 },
  modalBody: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  modalLogoutBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.danger, alignItems: 'center' },
  modalLogoutText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
