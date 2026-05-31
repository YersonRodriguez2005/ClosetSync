// src/services/notificationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Daily Outfit Notification Service
// Schedules a recurring local push notification every day at 7:00 AM.
// Uses @capacitor/local-notifications — works fully offline, no server needed.
//
// INSTALL:
//   npm install @capacitor/local-notifications
//   npx cap sync
//
// AndroidManifest.xml permissions are added automatically by Capacitor.
// For iOS add in Info.plist (Capacitor handles this via plugin config).
// ─────────────────────────────────────────────────────────────────────────────

import { LocalNotifications, ScheduleOptions } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

// Stable notification IDs (must be integers, never change them)
const DAILY_NOTIF_ID = 1001;

// ── Permission handling ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web: use browser Notification API as fallback
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return "Notification" in window && Notification.permission === "granted";
  }
  const { display } = await LocalNotifications.checkPermissions();
  return display === "granted";
}

// ── Daily notification scheduler ─────────────────────────────────────────────

/**
 * Schedules (or reschedules) the daily 7am outfit notification.
 * Safe to call multiple times — cancels the previous one first.
 */
export async function scheduleDailyOutfitNotification(): Promise<boolean> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    // Cancel any existing daily notification first
    await cancelDailyOutfitNotification();

    if (!Capacitor.isNativePlatform()) {
      // Web fallback: can't schedule truly recurring notifications,
      // but we store the preference so native builds use it.
      localStorage.setItem("daily_notif_enabled", "true");
      return true;
    }

    // Build the next 7:00 AM trigger
    const nextTrigger = getNext7AM();

    const options: ScheduleOptions = {
      notifications: [
        {
          id:    DAILY_NOTIF_ID,
          title: "👔 Tu look de hoy está listo",
          body:  "Abre Mi Estilo para ver tu outfit del día seleccionado por IA",
          sound: "default",
          // Schedule repeating every day at 7am
          schedule: {
            at:       nextTrigger,
            repeats:  true,
            every:    "day",
          },
          extra: { type: "daily_outfit" },
          // Android channel (created below)
          channelId: "daily_outfit",
          // Large icon (place in android/app/src/main/res/drawable)
          largeIcon:  "ic_launcher_foreground",
          iconColor:  "#667eea",
        },
      ],
    };

    await LocalNotifications.schedule(options);
    localStorage.setItem("daily_notif_enabled", "true");
    return true;
  } catch (err) {
    console.error("[notificationService] scheduleDailyOutfitNotification:", err);
    return false;
  }
}

export async function cancelDailyOutfitNotification(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem("daily_notif_enabled");
      return;
    }
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIF_ID }] });
    localStorage.removeItem("daily_notif_enabled");
  } catch (err) {
    console.error("[notificationService] cancelDailyOutfitNotification:", err);
  }
}

export function isDailyNotificationEnabled(): boolean {
  return localStorage.getItem("daily_notif_enabled") === "true";
}

// ── Android notification channel setup ───────────────────────────────────────
// Call once at app startup (e.g. in App.tsx or main.tsx)

export async function createNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id:          "daily_outfit",
      name:        "Outfit del día",
      description: "Notificación diaria con tu look sugerido",
      importance:  4,         // HIGH
      sound:       "default",
      vibration:   true,
      visibility:  1,         // PUBLIC
      lights:      true,
      lightColor:  "#667eea",
    });
  } catch (err) {
    console.error("[notificationService] createNotificationChannels:", err);
  }
}

// ── Notification tap handler ──────────────────────────────────────────────────
// Call once at app startup to handle taps that open the app from a notif.

export function setupNotificationTapHandler(
  navigateToDailyOutfit: () => void
): void {
  if (!Capacitor.isNativePlatform()) return;

  LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const extra = action.notification.extra as { type?: string } | undefined;
    if (extra?.type === "daily_outfit") {
      navigateToDailyOutfit();
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNext7AM(): Date {
  const now   = new Date();
  const next  = new Date(now);
  next.setHours(7, 0, 0, 0);

  // If it's already past 7am today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Returns a human-readable string of when the next notification fires.
 * Useful for settings UI: "Mañana a las 7:00 AM"
 */
export function getNextNotificationTime(): string {
  const next = getNext7AM();
  const now  = new Date();
  const isToday = next.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = next.toDateString() === tomorrow.toDateString();

  if (isToday)    return "Hoy a las 7:00 AM";
  if (isTomorrow) return "Mañana a las 7:00 AM";
  return next.toLocaleDateString("es-CO", { weekday: "long", hour: "2-digit", minute: "2-digit" });
}