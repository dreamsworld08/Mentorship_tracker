import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function StudentProfile() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      api.getStudentAnalytics(user.user_id)
        .then(setAnalytics)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      setShowLogoutConfirm(true);
    } else {
      const Alert = require('react-native').Alert;
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout },
      ]);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLg}>
            {user?.profile_photo_url ? (
              <Image source={{ uri: user.profile_photo_url }} style={styles.avatarLgImg} />
            ) : (
              <Ionicons name="person" size={36} color={theme.colors.textInverse} />
            )}
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            {user?.batch && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.batch}</Text>
              </View>
            )}
            {user?.exam_year && (
              <View style={[styles.badge, { backgroundColor: theme.colors.accentLight + '30' }]}>
                <Text style={[styles.badgeText, { color: theme.colors.accentDark }]}>Target: {user.exam_year}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailCard}>
            {[
              { icon: 'school', label: 'Course', value: user?.course || 'Not set' },
              { icon: 'book', label: 'Optional Subject', value: user?.optional_subject || 'Not set' },
              { icon: 'call', label: 'Phone', value: user?.phone || 'Not set' },
              { icon: 'people', label: 'Mentor', value: user?.mentor?.name || 'Not assigned' },
            ].map((item, idx) => (
              <View key={idx} style={[styles.detailRow, idx < 3 && styles.detailRowBorder]}>
                <View style={styles.detailLeft}>
                  <Ionicons name={item.icon as any} size={18} color={theme.colors.textTertiary} />
                  <Text style={styles.detailLabel}>{item.label}</Text>
                </View>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance */}
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <View style={styles.perfGrid}>
              {[
                { label: 'Overall', value: `${analytics.overall_pct}%`, color: theme.colors.primary },
                { label: 'Topics Done', value: analytics.completed, color: theme.colors.success },
                { label: 'Study Hours', value: `${analytics.total_hours}h`, color: theme.colors.accent },
                { label: 'Tasks Done', value: analytics.completed_tasks, color: theme.colors.primaryLight },
                { label: 'Sessions', value: analytics.total_sessions, color: theme.colors.warning },
                { label: 'Pending', value: analytics.pending_tasks, color: theme.colors.danger },
              ].map((item, idx) => (
                <View key={idx} style={styles.perfCard}>
                  <Text style={[styles.perfValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.perfLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity testID="logout-button" style={styles.logoutBtn} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Logout Confirmation Modal (Web) */}
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalBody}>Are you sure you want to logout?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-logout" style={styles.modalCancelBtn} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-logout" style={styles.modalLogoutBtn} onPress={handleLogout}>
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  profileCard: { alignItems: 'center', backgroundColor: theme.colors.paper, marginHorizontal: 16, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 20, marginTop: 8, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarLgImg: { width: 80, height: 80, borderRadius: 40 },
  profileName: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  profileEmail: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.colors.primary + '15' },
  badgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  detailCard: { backgroundColor: theme.colors.paper, borderRadius: 14, padding: 4, ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  perfCard: { width: '30%', backgroundColor: theme.colors.paper, borderRadius: 12, padding: 14, alignItems: 'center', ...theme.shadow.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  perfValue: { fontSize: 20, fontWeight: '800' },
  perfLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4, fontWeight: '600' },
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
