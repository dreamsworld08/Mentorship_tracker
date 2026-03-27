import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ImageBackground, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/AuthContext';
import { theme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { user, loading, login, loginWithSession } = useAuth();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');

  // Check for session_id in URL hash (web only - after Google OAuth redirect)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        if (sessionId) {
          handleGoogleCallback(sessionId);
          window.location.hash = '';
        }
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigateByRole(user.role);
    }
  }, [user, loading]);

  const navigateByRole = (role: string) => {
    if (role === 'student') router.replace('/student');
    else if (role === 'mentor') router.replace('/mentor');
    else if (role === 'admin') router.replace('/admin');
  };

  const handleGoogleCallback = async (sessionId: string) => {
    setLoggingIn(true);
    setError('');
    try {
      await loginWithSession(sessionId);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const redirectUrl = window.location.origin;
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  };

  const handleDemoLogin = async (role: string) => {
    setLoggingIn(true);
    setError('');
    try {
      await login(role);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="school" size={40} color={theme.colors.textInverse} />
          </View>
          <Text style={styles.brandName}>Sleepy Classes</Text>
          <Text style={styles.brandTag}>IAS Mentorship Tracker</Text>
        </View>
        <Text style={styles.heroTitle}>Your UPSC Journey,{'\n'}Tracked & Guided</Text>
        <Text style={styles.heroSubtitle}>
          Comprehensive mentorship platform for Civil Services preparation
        </Text>
      </View>

      <View style={styles.bottomCard}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          testID="login-google-button"
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loggingIn}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or try demo</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.demoRow}>
          <TouchableOpacity
            testID="demo-student-button"
            style={[styles.demoButton, styles.demoStudentBtn]}
            onPress={() => handleDemoLogin('student')}
            disabled={loggingIn}
          >
            <Ionicons name="person" size={16} color={theme.colors.primary} />
            <Text style={styles.demoButtonText}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="demo-mentor-button"
            style={[styles.demoButton, styles.demoMentorBtn]}
            onPress={() => handleDemoLogin('mentor')}
            disabled={loggingIn}
          >
            <Ionicons name="people" size={16} color={theme.colors.accentDark} />
            <Text style={[styles.demoButtonText, { color: theme.colors.accentDark }]}>Mentor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="demo-admin-button"
            style={[styles.demoButton, styles.demoAdminBtn]}
            onPress={() => handleDemoLogin('admin')}
            disabled={loggingIn}
          >
            <Ionicons name="shield" size={16} color={theme.colors.primaryDark} />
            <Text style={[styles.demoButtonText, { color: theme.colors.primaryDark }]}>Admin</Text>
          </TouchableOpacity>
        </View>

        {loggingIn && (
          <View style={styles.loggingInOverlay}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loggingInText}>Signing in...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  loadingText: {
    color: theme.colors.textInverse,
    marginTop: 12,
    fontSize: 16,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: 1,
  },
  brandTag: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textInverse,
    textAlign: 'center',
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  bottomCard: {
    backgroundColor: theme.colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    flex: 1,
  },
  googleButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    ...theme.shadow.md,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: theme.colors.textTertiary,
    fontSize: 13,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  demoStudentBtn: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(26,54,93,0.05)',
  },
  demoMentorBtn: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(214,158,46,0.05)',
  },
  demoAdminBtn: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: 'rgba(15,32,59,0.05)',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loggingInOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  loggingInText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
