import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { fetchParkingLots, ParkingLot } from "@/services/parkingService";

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<ParkingLot | null>(null);
  const [searchPin, setSearchPin] = useState<ParkingLot | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasNewNotifications = false;

  // ── Fetch parking lots from the backend on every tab focus ──
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          const data = await fetchParkingLots();
          if (!cancelled) setParkingLots(data);
        } catch (err) {
          console.warn("Failed to load parking lots", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ── Search helpers ──

  const startsWithSearch = (value: string, text: string) => {
    return value
      .toLowerCase()
      .split(" ")
      .some((word) => word.startsWith(text));
  };

  const filteredSuggestions = parkingLots.filter((lot) => {
    const text = searchText.trim().toLowerCase();
    if (!text) return false;

    return (
      startsWithSearch(lot.name, text) ||
      (lot.zone ? startsWithSearch(lot.zone, text) : false)
    );
  });

  const focusLocation = (lot: ParkingLot) => {
    setSelectedProperty(lot);
    setSearchPin(lot);
    setShowCard(true);
    Keyboard.dismiss();
    setShowSuggestions(false);

    mapRef.current?.animateToRegion(
      {
        latitude: lot.latitude,
        longitude: lot.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      700
    );
  };

  const handleSearch = () => {
    const text = searchText.trim().toLowerCase();
    if (!text) return;

    const found = parkingLots.find(
      (lot) =>
        startsWithSearch(lot.name, text) ||
        (lot.zone ? startsWithSearch(lot.zone, text) : false)
    );

    if (found) {
      focusLocation(found);
    }
  };

  // ── Helper to build display strings from API data ──

  const formatAvailable = (lot: ParkingLot) =>
    `${lot.availableSpots} vende`;

  const formatPrice = (lot: ParkingLot) =>
    `${lot.pricePerHour}ALL/Ora`;

  const formatHours = (lot: ParkingLot) => {
    if (!lot.openTime || !lot.closeTime) return "24 orë";
    const open = lot.openTime.substring(11, 16); // HH:mm from ISO
    const close = lot.closeTime.substring(11, 16);
    return `${open} - ${close}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        provider="google"
        style={styles.map}
        initialRegion={{
          latitude: 41.3275,
          longitude: 19.8189,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }}
        onPress={() => {
          Keyboard.dismiss();
          setShowSuggestions(false);
        }}
      >
        {parkingLots.map((lot) => (
          <Marker
            key={lot.id}
            coordinate={{
              latitude: lot.latitude,
              longitude: lot.longitude,
            }}
            title={lot.name}
            description={lot.zone ?? ""}
            onPress={() => {
              setSearchText("");
              focusLocation(lot);
            }}
          />
        ))}

        {searchPin && (
          <Marker
            coordinate={{
              latitude: searchPin.latitude,
              longitude: searchPin.longitude,
            }}
            pinColor="red"
            title={searchPin.name}
            description={searchPin.zone ?? ""}
          />
        )}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ED0000" />
        </View>
      )}

      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/black_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Pressable
        style={styles.notificationButton}
        onPress={() => {
          if (hasNewNotifications) {
            router.push("(screens)/notifications");
          } else {
            router.push("(screens)/no-notifications");
          }
        }}
      >
        <Ionicons name="notifications" size={24} color="#fff" />
        {hasNewNotifications && <View style={styles.redDot} />}
      </Pressable>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#000" />

        <TextInput
          placeholder="Kërko"
          placeholderTextColor="#979797"
          style={styles.searchInput}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <Pressable onPress={handleSearch}>
          <Ionicons name="arrow-forward-circle" size={24} color="#ED0000" />
        </Pressable>
      </View>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {filteredSuggestions.map((lot) => (
            <Pressable
              key={lot.id}
              style={styles.suggestionItem}
              onPress={() => {
                setSearchText(lot.name);
                focusLocation(lot);
              }}
            >
              <Ionicons name="location" size={18} color="#ED0000" />

              <View style={styles.suggestionTextWrapper}>
                <Text style={styles.suggestionTitle}>{lot.name}</Text>
                <Text style={styles.suggestionAddress}>
                  {lot.zone ?? ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {showCard && selectedProperty && (
        <Pressable
          style={styles.parkingCard}
          onPress={() =>
            router.push({
              pathname: "/parking-detail",
              params: {
                parkingId: String(selectedProperty.id),
              },
            })
          }
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a",
            }}
            style={styles.cardImage}
          />

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{selectedProperty.name}</Text>

              <Pressable onPress={() => setShowCard(false)}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.cardInfo}>{selectedProperty.zone ?? ""}</Text>
            <Text style={styles.cardInfo}>{formatHours(selectedProperty)}</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.price}>{formatPrice(selectedProperty)}</Text>

              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>
                  {formatAvailable(selectedProperty)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ECECEC" },
  map: { ...StyleSheet.absoluteFillObject },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 50,
  },

  logoWrapper: {
    position: "absolute",
    top: 1,
    alignSelf: "center",
    width: 700,
    height: 185,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: { width: 700, height: 185 },

  notificationButton: {
    position: "absolute",
    top: 62,
    right: 26,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(76,76,76,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  redDot: {
    position: "absolute",
    top: 12,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ED0000",
  },

  searchBox: {
    position: "absolute",
    top: 136,
    left: 25,
    right: 25,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    zIndex: 30,
  },

  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },

  suggestionsBox: {
    position: "absolute",
    top: 188,
    left: 25,
    right: 25,
    backgroundColor: "#FFF",
    borderRadius: 16,
    zIndex: 25,
  },

  suggestionItem: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
  },

  suggestionTextWrapper: { marginLeft: 10 },

  suggestionTitle: { fontWeight: "600" },

  suggestionAddress: { fontSize: 12, color: "#777" },

  parkingCard: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 108,
    height: 132,
    backgroundColor: "#000",
    borderRadius: 22,
    flexDirection: "row",
  },

  cardImage: {
    width: 135,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 21,
  },

  cardContent: { flex: 1, padding: 10 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardTitle: { color: "#fff" },

  cardInfo: { color: "#949494" },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  price: { color: "#fff" },

  availableBadge: {
    backgroundColor: "#ED0000",
    borderRadius: 20,
    padding: 6,
  },

  availableText: { color: "#fff" },
});