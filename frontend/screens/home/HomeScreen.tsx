import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Image as RNImage,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useI18n } from "@/i18n/I18nProvider";
import { fetchParkingById } from "@/services/parkingService";
import { openReservationOverlay } from "@/services/reservationOverlay";
import {
  fetchCurrentReservation,
  getCachedCurrentReservation,
  getCachedReservationHistory,
  fetchMyHistory,
  ReservationData,
  subscribeReservationChanges,
} from "@/services/reservationService";

type ParkingPreviewMap = Record<number, string | null>;

function isFutureTimestamp(value?: string | null) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function isReservationActive(reservation: ReservationData) {
  if (reservation.status === "CONFIRMED") {
    return isFutureTimestamp(reservation.endTime);
  }

  if (reservation.status === "COMPLETED") {
    return isFutureTimestamp(reservation.endTime);
  }

  return false;
}

async function buildParkingPreviewMap(reservations: ReservationData[]) {
  const uniqueParkingIds = [...new Set(reservations.map((item) => item.parkingId).filter(Boolean))];
  const previews = await Promise.all(
    uniqueParkingIds.map(async (parkingId) => {
      try {
        const parking = await fetchParkingById(parkingId);
        return [parkingId, parking.imageUrls[0] ?? null] as const;
      } catch {
        return [parkingId, null] as const;
      }
    })
  );

  return Object.fromEntries(previews) as ParkingPreviewMap;
}

export default function HomeScreen() {
  const { t } = useI18n();
  const [activeReservation, setActiveReservation] = useState<ReservationData | null>(null);
  const [previousReservations, setPreviousReservations] = useState<ReservationData[]>([]);
  const [parkingPreviews, setParkingPreviews] = useState<ParkingPreviewMap>({});
  const [loading, setLoading] = useState(true);

  const loadHomeData = useCallback(async (cancelledRef?: { current: boolean }) => {
    try {
      const cachedCurrent = getCachedCurrentReservation();
      const cachedHistory = getCachedReservationHistory();

      if (cachedCurrent || cachedHistory) {
        const activeFromCache =
          cachedCurrent && isReservationActive(cachedCurrent)
            ? cachedCurrent
            : cachedHistory?.find(isReservationActive) ?? null;
        const previousFromCache = (cachedHistory ?? [])
          .filter((r) => r.id !== activeFromCache?.id)
          .slice(0, 4);
        setActiveReservation(activeFromCache);
        setPreviousReservations(previousFromCache);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const [currentReservation, history] = await Promise.all([
        fetchCurrentReservation().catch(() => null),
        fetchMyHistory().catch(() => [] as ReservationData[]),
      ]);
      if (cancelledRef?.current) return;

      const active =
        currentReservation && isReservationActive(currentReservation)
          ? currentReservation
          : history.find(isReservationActive);
      const nextPreviousReservations = history.filter((r) => r.id !== active?.id).slice(0, 4);
      const previewMap = await buildParkingPreviewMap(
        [active, ...nextPreviousReservations].filter(Boolean) as ReservationData[]
      );
      if (cancelledRef?.current) return;

      setActiveReservation(active ?? null);
      setPreviousReservations(nextPreviousReservations);
      setParkingPreviews(previewMap);
    } catch (err) {
      console.warn("Failed to load home data", err);
    } finally {
      if (!cancelledRef?.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };
    void loadHomeData(cancelledRef);
    const unsubscribe = subscribeReservationChanges(() => {
      void loadHomeData(cancelledRef);
    });

    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [loadHomeData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("home.currentReservation")}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#ED0000" style={styles.loadingBlock} />
        ) : activeReservation ? (
          <Pressable style={styles.currentCard} onPress={openReservationOverlay}>
            {parkingPreviews[activeReservation.parkingId] ? (
              <RNImage
                source={{ uri: parkingPreviews[activeReservation.parkingId] as string }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.imagePlaceholder} />
            )}

            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>{activeReservation.parkingName}</Text>
              <Text style={styles.currentAddress}>
                {activeReservation.totalCost ? `${activeReservation.totalCost} ALL` : ""}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {activeReservation.status === "CONFIRMED"
                    ? t("home.confirmed")
                    : t("home.pending")}
                </Text>
              </View>
            </View>

          </Pressable>
        ) : (
          <View style={styles.currentCard}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>{t("home.noCurrentReservation")}</Text>
              <Text style={styles.currentAddress}>{t("home.goToMap")}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("home.previousReservations")}</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#ED0000" style={styles.loadingBlock} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {previousReservations.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/parking-detail",
                    params: { parkingId: String(item.parkingId) },
                  })
                }
              >
                <HistoryPreviewCard
                  imageUrl={parkingPreviews[item.parkingId]}
                  spots={t("home.freeSpots", {
                    count: item.parkingAvailableSpots ?? item.spotsReserved,
                  })}
                  statusColor={
                    item.status === "CONFIRMED" || item.status === "SOFT_HOLD"
                      ? "#6ACA6A"
                      : "#ED0000"
                  }
                  name={item.parkingName}
                  address={
                    item.vehiclePlate
                      ? t("home.plateLabel", { plate: item.vehiclePlate })
                      : t("home.yourReservation")
                  }
                  price={`${item.totalCost} ALL`}
                />
              </Pressable>
            ))}

            {previousReservations.length === 0 && (
              <Text style={styles.emptyText}>{t("home.noPreviousReservations")}</Text>
            )}
          </ScrollView>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

function HistoryPreviewCard({
  spots,
  statusColor,
  name,
  address,
  price,
  imageUrl,
}: {
  spots: string;
  statusColor: string;
  name: string;
  address: string;
  price: string;
  imageUrl?: string | null;
}) {
  return (
    <View style={styles.partnerCard}>
      {imageUrl ? (
        <RNImage source={{ uri: imageUrl }} style={styles.partnerImagePlaceholder} />
      ) : (
        <View style={styles.partnerImagePlaceholder} />
      )}

      <View style={[styles.partnerBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.partnerBadgeText}>{spots}</Text>
      </View>

      <Text style={styles.partnerName}>{name}</Text>
      <Text style={styles.partnerAddress}>{address}</Text>
      <Text style={styles.partnerPrice}>{price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 145,
    height: 55,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    marginTop: 40,
    marginBottom: 14,
  },
  loadingBlock: {
    marginVertical: 20,
  },
  currentCard: {
    backgroundColor: "#323232",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    height: 130,
  },
  imagePlaceholder: {
    width: 122,
    height: 110,
    backgroundColor: "#555",
    borderRadius: 12,
  },
  previewImage: {
    width: 122,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#555",
  },
  currentInfo: {
    flex: 1,
    marginLeft: 12,
    height: 110,
    justifyContent:"space-between"
  },
  currentName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    width: 300,
    marginTop:10,
  },
  currentAddress: {
    color: "#fff",
    fontSize: 15,
  },
  statusBadge: {
    marginTop: 15,
    marginBottom: 1,
    alignSelf: "flex-start",
    backgroundColor: "rgba(106,202,106,0.28)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  partnerCard: {
    width: 230,
    height: 280,
    backgroundColor: "#191919",
    borderRadius: 18,
    marginRight: 14,
    padding: 12,

  },
  partnerImagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    backgroundColor: "#444",
  },
  partnerBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  partnerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  partnerName: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  partnerAddress: {
    marginTop: 5,
    color: "#A3A3A3",
    fontSize: 12,
  },
  partnerPrice: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#9D9D9D",
    marginLeft: 10,
  },
});
