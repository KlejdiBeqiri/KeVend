import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import ReservingModal from "@/screens/reservations/ReservingModal";
import { fetchParkingById, ParkingLot } from "@/services/parkingService";

export default function ParkingDetailScreen() {
  const params = useLocalSearchParams();

  // Support both old string params and new parkingId param
  const parkingId = params.parkingId ? Number(params.parkingId) : null;

  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const images = [1, 2, 3];

  useEffect(() => {
    if (!parkingId) {
      // Fallback: use route params if no parkingId (backwards compat)
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchParkingById(parkingId);
        if (!cancelled) setParking(data);
      } catch (err: any) {
        if (!cancelled) setError("Nuk u gjet parkimi.");
        console.warn("Failed to fetch parking", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parkingId]);

  // Derive display values from API data or legacy route params
  const name = parking?.name ?? (params.name as string) ?? "";
  const address = parking?.zone ?? (params.address as string) ?? "";
  const hours = parking
    ? parking.openTime && parking.closeTime
      ? `${parking.openTime.substring(11, 16)} - ${parking.closeTime.substring(11, 16)}`
      : "24 orë"
    : (params.hours as string) ?? "";
  const pricePerHour = parking?.pricePerHour ?? 0;
  const price = parking
    ? `${parking.pricePerHour}ALL`
    : (params.price as string) ?? "";
  const available = parking
    ? `${parking.availableSpots} vende`
    : (params.available as string) ?? "";
  const rating = (params.rating as string) ?? "4.5";
  const reviews = (params.reviews as string) ?? "0";

  const goPrevious = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goNext = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ED0000" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={{ color: "#fff", fontSize: 16 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imagePlaceholder}>
          <View style={styles.greySquare}>
            <Text style={styles.imageText}>Foto {currentImageIndex + 1}</Text>
          </View>

          <View style={styles.backWrapper}>
            <BackButton />
          </View>

          <Pressable style={styles.leftArrow} onPress={goPrevious}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>

          <Pressable style={styles.rightArrow} onPress={goNext}>
            <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.title}>{name}</Text>

              <Text style={styles.rating}>
                {rating} ★★★★★ ({reviews})
              </Text>
            </View>

            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>{available}</Text>
            </View>
          </View>

          <Text style={styles.info}>{address}</Text>
          <Text style={styles.info}>{hours}</Text>

          <Pressable
            style={styles.reserveButton}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
              locations={[0, 0.378, 0.6298, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.reserveGradient}
            >
              <Text style={styles.reserveText}>Rezervo vendin</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.priceBox}>
            <Text style={styles.priceTitle}>Çmimet/Ore</Text>

            <View style={styles.line} />

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>0 - 1h</Text>
              <Text style={styles.priceText}>{pricePerHour} ALL</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>1 - 2h</Text>
              <Text style={styles.priceText}>{pricePerHour * 2} ALL</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>3 - 4h</Text>
              <Text style={styles.priceText}>{pricePerHour * 4} ALL</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>4 - 5h</Text>
              <Text style={styles.priceText}>{pricePerHour * 5} ALL</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>5 - 12h</Text>
              <Text style={styles.priceText}>{pricePerHour * 12} ALL</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>12 - 24h</Text>
              <Text style={styles.priceText}>{price}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ReservingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        parkingId={parkingId ?? undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  centered: {
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingBottom: 30,
  },

  imagePlaceholder: {
    width: "100%",
    height: 270,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },

  greySquare: {
    width: "100%",
    height: "100%",
    backgroundColor: "#777777",
    alignItems: "center",
    justifyContent: "center",
  },

  imageText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  backWrapper: {
    position: "absolute",
    top: -50,
    left: -5,
  },

  leftArrow: {
    position: "absolute",
    left: 18,
    top: "50%",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  rightArrow: {
    position: "absolute",
    right: 18,
    top: "50%",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 22,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  rating: {
    color: "#F5C542",
    fontSize: 12,
    marginTop: 5,
  },

  info: {
    color: "#9B9B9B",
    fontSize: 14,
    marginTop: 5,
  },

  availableBadge: {
    backgroundColor: "#ED0000",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  availableText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  reserveButton: {
    alignSelf: "center",
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 30,
  },

  reserveGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },

  reserveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  priceBox: {
    backgroundColor: "#333333",
    borderRadius: 14,
    padding: 18,
    marginTop: 35,
  },

  priceTitle: {
    color: "#DADADA",
    fontSize: 15,
    fontWeight: "600",
  },

  line: {
    height: 1,
    backgroundColor: "#777777",
    marginVertical: 12,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  priceText: {
    color: "#DADADA",
    fontSize: 14,
  },
});