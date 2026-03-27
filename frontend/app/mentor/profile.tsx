import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/AuthContext';
import { theme } from '../../src/theme';

export default function MentorProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.title}>Profile</Text></View>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {user?.profile_photo_url ? (
              <Image source={{ uri: user.profile_photo_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={36} color={theme.colors.textInverse} />
            )}
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Mentor</Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.detailCard}>
            {[
              { icon: 'people', label: 'Mentees', value: `${user?.mentee_count || 0} students` },
              { icon: 'school', label: 'Course', value: user?.course || 'N/A' },
              { icon: 'call', label: 'Phone', value: user?.phone || 'N/A' },
            ].map((item, idx) => (
              <View key={idx} style={[styles.detailRow, idx < 2 && styles.detailRowBorder]}>
                <View style={styles.detailLeft}>
                  <Ionicons name={item.icon as any} size={18} color={theme.colors.textTertiary} />
                  <Text style={styles.detailLabel}>{item.label}</Text>
                </View>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <TouchableOpacity testID="mentor-logout-button" style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  profileCard: { alignItems: 'center', backgroundColor: theme.colors.paper, marginHorizontal: 16, borderRadius: 20, paddingVertical: 24, marginTop: 8, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.colors.accent + '20' },
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
});
