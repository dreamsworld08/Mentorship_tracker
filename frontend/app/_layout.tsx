import { Stack } from 'expo-router';
import { AuthProvider } from '../src/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="student" options={{ gestureEnabled: false }} />
        <Stack.Screen name="mentor" options={{ gestureEnabled: false }} />
        <Stack.Screen name="admin" options={{ gestureEnabled: false }} />
      </Stack>
    </AuthProvider>
  );
}
