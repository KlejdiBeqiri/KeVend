import api from "../api";
import {
  getCachedValue,
  hasCachedValue,
  invalidateCache,
  peekCachedValue,
  setCachedValue,
} from "./appCache";

export type NotificationType =
  | "CHECK_IN_CONFIRMATION"
  | "SOFT_HOLD_EXPIRED"
  | "EXPIRY_WARNING"
  | "EXPIRY_REACHED"
  | "UNPAID_REMINDER"
  | "OTP"
  | "RESERVATION_CONFIRMATION";

export type DeliveryStatus = "PENDING" | "DELIVERED" | "FAILED";
export type NotificationChannel = "PUSH" | "SMS";
export type PushPlatform = "ANDROID" | "IOS";

export interface NotificationItem {
  id: number;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  sentAt: string | number[] | null;
  createdAt: string | number[];
}

const NOTIFICATIONS_CACHE_KEY = "notifications:me";
const NOTIFICATIONS_TTL_MS = 10_000;
const notificationChangeListeners = new Set<() => void>();

function emitNotificationsChanged() {
  notificationChangeListeners.forEach((listener) => listener());
}

export async function fetchMyNotifications(): Promise<NotificationItem[]> {
  const cached = getCachedValue<NotificationItem[]>(NOTIFICATIONS_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const { data } = await api.get<NotificationItem[]>("/notifications/me");
  const normalized = Array.isArray(data) ? data : [];
  setCachedValue(NOTIFICATIONS_CACHE_KEY, normalized, NOTIFICATIONS_TTL_MS);
  return normalized;
}

export function getCachedNotifications(): NotificationItem[] | null {
  return getCachedValue<NotificationItem[]>(NOTIFICATIONS_CACHE_KEY);
}

export function peekNotificationsSnapshot(): NotificationItem[] | null {
  return peekCachedValue<NotificationItem[]>(NOTIFICATIONS_CACHE_KEY);
}

export function hasFreshNotificationsCache(): boolean {
  return hasCachedValue(NOTIFICATIONS_CACHE_KEY);
}

export async function registerPushToken(payload: {
  token: string;
  platform: PushPlatform;
}): Promise<void> {
  await api.post("/users/me/push-tokens", payload);
}

export async function removePushToken(token: string): Promise<void> {
  await api.delete("/users/me/push-tokens", {
    params: { token },
  });
}

export async function triggerTestPush(): Promise<NotificationItem> {
  const { data } = await api.post<NotificationItem>("/notifications/test-push");
  invalidateNotificationsCache();
  return data;
}

export function invalidateNotificationsCache() {
  invalidateCache(NOTIFICATIONS_CACHE_KEY);
  emitNotificationsChanged();
}

export function subscribeNotificationChanges(listener: () => void) {
  notificationChangeListeners.add(listener);
  return () => {
    notificationChangeListeners.delete(listener);
  };
}
