import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DeliveryStatus,
  fetchMyNotifications,
  getCachedNotifications,
  hasFreshNotificationsCache,
  NotificationItem,
  NotificationType,
  subscribeNotificationChanges,
  triggerTestPush,
} from "@/services/notificationsService";
import { useI18n } from "@/i18n/I18nProvider";

function parseLocalDateTime(raw: string | number[] | null): Date | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = raw;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return new Date(raw);
}

function formatDate(raw: string | number[], locale: string): string {
  const date = parseLocalDateTime(raw);
  if (!date) return "";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(raw: string | number[] | null, locale: string): string {
  const date = parseLocalDateTime(raw);
  if (!date) return "";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  CHECK_IN_CONFIRMATION: "checkmark-done-circle-outline",
  SOFT_HOLD_EXPIRED: "timer-outline",
  EXPIRY_WARNING: "alert-circle-outline",
  EXPIRY_REACHED: "time-outline",
  UNPAID_REMINDER: "card-outline",
  OTP: "shield-checkmark-outline",
  RESERVATION_CONFIRMATION: "car-outline",
};

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  DELIVERED: "#38BDF8",
  PENDING: "#F59E0B",
  FAILED: "#F43F5E",
};

export default function NotificationsScreen() {
  const { locale, t } = useI18n();
  const dateLocale = locale === "sq" ? "sq-AL" : "en-US";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringTest, setTriggeringTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (refresh = false) => {
    const cached = getCachedNotifications();
    const shouldUseCachedFirst = !refresh && cached && cached.length >= 0;

    if (shouldUseCachedFirst) {
      setNotifications(cached);
      setLoading(false);
    }

    if (!refresh && hasFreshNotificationsCache()) {
      setError(null);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else if (!shouldUseCachedFirst) {
      setLoading(true);
    }

    try {
      const data = await fetchMyNotifications();
      setNotifications(data);
      setError(null);
    } catch {
      setError(t("notifications.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    const cached = getCachedNotifications();
    if (cached) {
      setNotifications(cached);
      setLoading(false);
    }

    void loadNotifications();
    const unsubscribe = subscribeNotificationChanges(() => {
      void loadNotifications(true);
    });

    return unsubscribe;
  }, [loadNotifications]);

  const grouped = useMemo(
    () =>
      notifications.reduce<Record<string, NotificationItem[]>>((acc, item) => {
        const label = formatDate(item.createdAt, dateLocale);
        if (!acc[label]) acc[label] = [];
        acc[label].push(item);
        return acc;
      }, {}),
    [dateLocale, notifications]
  );

  const deliveredCount = notifications.filter((item) => item.deliveryStatus === "DELIVERED").length;

  const handleTriggerTest = useCallback(async () => {
    try {
      setTriggeringTest(true);
      await triggerTestPush();
      await loadNotifications(true);
    } catch {
      setError(t("notifications.testError"));
    } finally {
      setTriggeringTest(false);
    }
  }, [loadNotifications, t]);

  const typeLabels: Record<NotificationType, string> = {
    CHECK_IN_CONFIRMATION: t("notifications.type.checkin"),
    SOFT_HOLD_EXPIRED: t("notifications.type.softHold"),
    EXPIRY_WARNING: t("notifications.type.expiryWarning"),
    EXPIRY_REACHED: t("notifications.type.expiryReached"),
    UNPAID_REMINDER: t("notifications.type.unpaid"),
    OTP: t("notifications.type.security"),
    RESERVATION_CONFIRMATION: t("notifications.type.reservation"),
  };

  const statusText: Record<DeliveryStatus, string> = {
    DELIVERED: t("notifications.delivered"),
    PENDING: t("notifications.pending"),
    FAILED: t("notifications.failed"),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor="#FFFFFF"
          />
        }
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow}>{t("notifications.center")}</Text>
            <Text style={styles.heroTitle}>{t("notifications.allInOne")}</Text>
            <Text style={styles.heroMeta}>
              {t("notifications.stats", { count: notifications.length, delivered: deliveredCount })}
            </Text>
            <Pressable
              style={[styles.testButton, triggeringTest && styles.testButtonDisabled]}
              onPress={handleTriggerTest}
              disabled={triggeringTest}
            >
              <Ionicons name="flash-outline" size={16} color="#031225" />
              <Text style={styles.testButtonText}>
                {triggeringTest ? t("notifications.sendingTest") : t("notifications.sendTest")}
              </Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#60A5FA" />
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={38} color="#94A3B8" />
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.stateCard}>
            <Image
              source={require("../../assets/notifications.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>{t("notifications.emptyTitle")}</Text>
            <Text style={styles.stateText}>
              {t("notifications.emptyText")}
            </Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <View key={date} style={styles.group}>
              <Text style={styles.groupLabel}>{date}</Text>
              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={TYPE_ICON[item.type]} size={22} color="#FFFFFF" />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle}>{typeLabels[item.type]}</Text>
                      <Text style={styles.cardTime}>{formatTime(item.sentAt ?? item.createdAt, dateLocale)}</Text>
                    </View>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${STATUS_COLOR[item.deliveryStatus]}22` },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: STATUS_COLOR[item.deliveryStatus] },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: STATUS_COLOR[item.deliveryStatus] },
                          ]}
                        >
                          {statusText[item.deliveryStatus]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    width: 145,
    height: 55,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: "#101A33",
    padding: 18,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    marginBottom: 22,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: {
    flex: 1,
  },
  heroEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  heroMeta: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  testButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E2ECFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  testButtonText: {
    color: "#031225",
    fontSize: 13,
    fontWeight: "700",
  },
  centerState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  stateCard: {
    borderRadius: 24,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  stateText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyImage: {
    width: 86,
    height: 86,
  },
  emptyTitle: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  group: {
    marginBottom: 22,
  },
  groupLabel: {
    marginBottom: 10,
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.13)",
    padding: 16,
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cardTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
  cardMessage: {
    marginTop: 8,
    color: "#D7E2F0",
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
