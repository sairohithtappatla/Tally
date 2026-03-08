/**
 * notificationService.ts
 *
 * Handles FCM push notification setup on the device.
 * Uses getDevicePushTokenAsync() to get the raw FCM token
 * (not the Expo proxy token) so our PostgreSQL function can
 * call the Firebase FCM API directly via pg_net.
 *
 * Flow:
 *   App launches / user logs in
 *     → request notification permission
 *     → getDevicePushTokenAsync() → raw FCM token
 *     → save to user_profiles.push_token in Supabase
 *
 *   pg_cron fires at 9 PM IST
 *     → send_daily_spending_notifications() SQL function
 *     → pg_net POST to https://fcm.googleapis.com/fcm/send
 *     → notification appears on device
 */

import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import type * as ExpoNotifications from 'expo-notifications';

/**
 * notificationService.ts
 *
 * Handles FCM push notification setup on the device.
 * Uses getDevicePushTokenAsync() to get the raw FCM token
 * (not the Expo proxy token) so our PostgreSQL function can
 * call the Firebase FCM API directly via pg_net.
 */

// ── Expo Go guard ────────────────────────────────────────────────────────────
// expo-notifications remote push support was removed from Expo Go in SDK 53.
// We must avoid importing it at the top level to prevent the "NamelessError" crash/log.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Use dynamic require for expo-notifications to avoid side-effects in Expo Go
let Notifications: typeof ExpoNotifications | null = null;
if (!IS_EXPO_GO) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.error('[Notifications] Failed to load expo-notifications:', e);
  }
}

// Only configure handler in real builds (not Expo Go)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ── Notification channel (Android 8+) ───────────────────────────────────────
async function createNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;

  await Notifications.setNotificationChannelAsync('daily-summary', {
    name: 'Daily Spending Summary',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1E90FF',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// ── Permission + token ───────────────────────────────────────────────────────
/**
 * Requests permission and returns the raw FCM device token.
 * Returns null when: physical device unavailable, permission denied,
 * or google-services.json missing.
 */
export async function getFCMToken(): Promise<string | null> {
  if (IS_EXPO_GO || !Notifications) {
    console.log('[Notifications] FCM tokens are not supported in Expo Go.');
    return null;
  }

  // FCM only works on real devices
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device.');
    return null;
  }

  // Ensure Android channel exists
  await createNotificationChannel();

  // Request permission (mandatory on Android 13+ / iOS)
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted by user.');
    return null;
  }

  try {
    // getDevicePushTokenAsync → raw FCM token string
    // (requires google-services.json present at build time)
    const result = await Notifications.getDevicePushTokenAsync();
    console.log('[Notifications] FCM token obtained.');
    return result.data as string;
  } catch (error) {
    console.error('[Notifications] Failed to get FCM token:', error);
    return null;
  }
}

// ── Save token to Supabase ───────────────────────────────────────────────────
async function saveFCMToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('[Notifications] Failed to save token to DB:', error.message);
  } else {
    console.log('[Notifications] FCM token saved to user_profiles.');
  }
}

// ── Public entry point ───────────────────────────────────────────────────────
/**
 * Call this once after the user is authenticated.
 * Requests permission, gets FCM token, and persists it to Supabase.
 * Safe to call multiple times — token is stable unless the app is reinstalled.
 */
export async function setupPushNotifications(userId: string): Promise<void> {
  // Skip entirely in Expo Go — remote push was removed from Expo Go in SDK 53
  if (IS_EXPO_GO) {
    console.log('[Notifications] Skipping setup in Expo Go (use a dev build for real push).');
    return;
  }

  try {
    const token = await getFCMToken();
    if (token) {
      await saveFCMToken(userId, token);
    }
  } catch (error) {
    // Never crash the auth flow due to notification setup failure
    console.error('[Notifications] Setup error (non-fatal):', error);
  }
}
