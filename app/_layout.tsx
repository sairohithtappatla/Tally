import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Watches auth state at runtime — redirects to welcome on logout */
function AuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    if (!user && inTabs) {
      // User logged out while inside the app — go to welcome
      router.replace('/welcome');
    }
  }, [user, loading, segments]);

  return null;
}

/** Biometric Lock Screen Wrapper */
function BiometricGuard({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { user, loading } = useAuth();

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // If the Android device doesn't have a fingerprint scanner or PIN setup, just let them in
      if (!hasHardware || !isEnrolled) {
        setIsUnlocked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Tally to view your finances',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  useEffect(() => {
    // Only trigger fingerprint prompt if a user is logged in
    // Since we removed the AppState listener, this only runs on a "Cold Start"
    if (user && !loading) {
      authenticate();
    }
  }, [user, loading]);

  // If there's no user logged in, bypass the lock screen entirely
  if (!user) {
    return <>{children}</>;
  }

  // If locked, show the Lock Screen instead of the App
  if (!isUnlocked) {
    return (
      <View style={styles.lockScreen}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print" size={50} color="#6366F1" />
        </View>
        <Text style={styles.lockTitle}>Tally is Locked</Text>
        <Text style={styles.lockSub}>Your financial data is secured.</Text>

        <TouchableOpacity style={styles.unlockButton} onPress={authenticate}>
          <Text style={styles.unlockButtonText}>Tap to Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If unlocked, render the normal app content
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <BiometricGuard>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGuard />
          <Stack initialRouteName="index">
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </BiometricGuard>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  lockSub: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 40,
  },
  unlockButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
