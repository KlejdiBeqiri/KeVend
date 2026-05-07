import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
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

type PropertyLocation = {
  id: number;
  name: string;
  address: string;
  hours: string;
  price: string;
  available: string;
  rating: string;
  reviews: string;
  latitude: number;
  longitude: number;
};

const properties: PropertyLocation[] = [
  {
    id: 1,
    name: "Parkimi Toptani",
    address: "Toptani Center, Tiranë",
    hours: "9:00 - 21:00",
    price: "2500ALL/24h",
    available: "3 vende",
    rating: "4.5",
    reviews: "1203",
    latitude: 41.3277,
    longitude: 19.8216,
  },
  {
    id: 2,
    name: "Parkimi Skënderbej",
    address: "Sheshi Skënderbej, Tiranë",
    hours: "8:00 - 22:00",
    price: "2000ALL/24h",
    available: "5 vende",
    rating: "4.3",
    reviews: "842",
    latitude: 41.3275,
    longitude: 19.8189,
  },
  {
    id: 3,
    name: "Parkimi Blloku",
    address: "Blloku, Tiranë",
    hours: "24 orë",
    price: "3000ALL/24h",
    available: "2 vende",
    rating: "4.7",
    reviews: "980",
    latitude: 41.3186,
    longitude: 19.8156,
  },
];

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [searchText, setSearchText] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyLocation | null>(null);
  const [searchPin, setSearchPin] = useState<PropertyLocation | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasNewNotifications = false;

  const startsWithSearch = (value: string, text: string) => {
    return value
      .toLowerCase()
      .split(" ")
      .some((word) => word.startsWith(text));
  };

  const filteredSuggestions = properties.filter((property) => {
    const text = searchText.trim().toLowerCase();
    if (!text) return false;

    return (
      startsWithSearch(property.name, text) ||
      startsWithSearch(property.address, text)
    );
  });

  const focusLocation = (property: PropertyLocation) => {
    setSelectedProperty(property);
    setSearchPin(property);
    setShowCard(true);
    Keyboard.dismiss();
    setShowSuggestions(false);

    mapRef.current?.animateToRegion(
      {
        latitude: property.latitude,
        longitude: property.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      700
    );
  };

  const handleSearch = () => {
    const text = searchText.trim().toLowerCase();
    if (!text) return;

    const foundProperty = properties.find(
      (property) =>
        startsWithSearch(property.name, text) ||
        startsWithSearch(property.address, text)
    );

    if (foundProperty) {
      focusLocation(foundProperty);
    }
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
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: property.latitude,
              longitude: property.longitude,
            }}
            title={property.name}
            description={property.address}
            onPress={() => {
              setSearchText("");
              focusLocation(property);
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
            description={searchPin.address}
          />
        )}
      </MapView>

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
          {filteredSuggestions.map((property) => (
            <Pressable
              key={property.id}
              style={styles.suggestionItem}
              onPress={() => {
                setSearchText(property.name);
                focusLocation(property);
              }}
            >
              <Ionicons name="location" size={18} color="#ED0000" />

              <View style={styles.suggestionTextWrapper}>
                <Text style={styles.suggestionTitle}>{property.name}</Text>
                <Text style={styles.suggestionAddress}>
                  {property.address}
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
                name: selectedProperty.name,
                address: selectedProperty.address,
                hours: selectedProperty.hours,
                price: selectedProperty.price,
                available: selectedProperty.available,
                rating: selectedProperty.rating,
                reviews: selectedProperty.reviews,
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

            <Text style={styles.cardInfo}>{selectedProperty.address}</Text>
            <Text style={styles.cardInfo}>{selectedProperty.hours}</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.price}>{selectedProperty.price}</Text>

              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>
                  {selectedProperty.available}
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

  cardImage: { width: 135, borderTopLeftRadius: 22, borderBottomLeftRadius: 21, },

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