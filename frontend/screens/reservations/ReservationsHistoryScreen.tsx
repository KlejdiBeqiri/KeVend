import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  fetchMyHistory,
  ReservationData,
} from "@/services/reservationService";

// ─── Status helpers ─────────────────────────────────────────────────────────────

const isActiveStatus = (status: string) =>
  status === "SOFT_HOLD" || status === "CONFIRMED";

const statusLabel = (status: string) =>
  isActiveStatus(status) ? "Hapur" : "Mbyllur";

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const months = [
    "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
    "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ReservationsHistoryScreen() {
  const hasNotifications = false;

  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          const data = await fetchMyHistory();
          if (!cancelled) setReservations(data);
        } catch (err) {
          console.warn("Failed to load reservation history", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Group reservations by date
  const grouped = reservations.reduce<Record<string, ReservationData[]>>(
    (groups, item) => {
      const dateKey = formatDate(item.startTime);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
      return groups;
    },
    {}
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Pressable
          style={styles.bellWrapper}
          onPress={() => {
            if (hasNotifications) {
              router.push("/notifications");
            } else {
              router.push("/no-notifications");
            }
          }}
        >
          <Ionicons name="notifications-outline" size={27} color="#fff" />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Rezervime të mëparshme</Text>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#ED0000"
            style={{ marginTop: 40 }}
          />
        )}

        {!loading && reservations.length === 0 && (
          <Text style={styles.emptyText}>Nuk keni rezervime të mëparshme.</Text>
        )}

        {!loading &&
          Object.entries(grouped).map(([date, items]) => (
            <View key={date} style={styles.group}>
              <Text style={styles.dateText}>{date}</Text>

              {items.map((item) => (
                <ReservationCard key={item.id} item={item} />
              ))}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Reservation Card ───────────────────────────────────────────────────────────

function ReservationCard({ item }: { item: ReservationData }) {
  const isOpen = isActiveStatus(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />

      <View style={styles.cardContent}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isOpen ? "#6ACA6A" : "#ED0000" },
            ]}
          >
            <Text style={styles.badgeText}>{statusLabel(item.status)}</Text>
          </View>

          <View style={styles.spotsBadge}>
            <Text style={styles.badgeText}>{item.spotsReserved} vende</Text>
          </View>
        </View>

        <Text style={styles.parkingName}>{item.parkingName}</Text>
        <Text style={styles.address}>
          {item.totalCost ? `${item.totalCost} ALL` : ""}
        </Text>

        <Pressable
          style={styles.reserveAgainButton}
          onPress={() =>
            router.push({
              pathname: "/parking-detail",
              params: { parkingId: String(item.parkingId) },
            })
          }
        >
          <Text style={styles.reserveAgainText}>Rezervo Përsëri</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    height: 105,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 135,
    height: 55,
  },

  bellWrapper: {
    position: "absolute",
    right: 28,
    top: 38,
  },

  notificationDot: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ED0000",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 115,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
    marginBottom: 18,
    marginLeft: 12,
  },

  emptyText: {
    color: "#9D9D9D",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },

  group: {
    marginBottom: 12,
  },

  dateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
    marginBottom: 10,
  },

  card: {
    height: 105,
    backgroundColor: "#323232",
    borderRadius: 10,
    flexDirection: "row",
    padding: 8,
    marginBottom: 14,
  },

  imagePlaceholder: {
    width: 115,
    height: 89,
    borderRadius: 8,
    backgroundColor: "#555",
  },

  cardContent: {
    flex: 1,
    marginLeft: 10,
  },

  badgeRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 5,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  spotsBadge: {
    backgroundColor: "#ED0000",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "500",
  },

  parkingName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  address: {
    color: "#9D9D9D",
    fontSize: 10,
    marginTop: 2,
  },

  reserveAgainButton: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reserveAgainText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "600",
  },
});