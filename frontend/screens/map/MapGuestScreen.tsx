import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

type Property = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

const properties: Property[] = [
  {
    id: 1,
    name: "Parkimi Toptani",
    address: "Toptani Center, Tiranë",
    latitude: 41.3277,
    longitude: 19.8216,
  },
  {
    id: 2,
    name: "Parkimi Skënderbej",
    address: "Sheshi Skënderbej, Tiranë",
    latitude: 41.3275,
    longitude: 19.8189,
  },
  {
    id: 3,
    name: "Parkimi Blloku",
    address: "Blloku, Tiranë",
    latitude: 41.3186,
    longitude: 19.8156,
  },
];

export default function MapGuestScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [searchText, setSearchText] = useState("");
  const [searchPin, setSearchPin] = useState<Property | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const focusLocation = (property: Property) => {
    setSearchPin(property);
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
      setSearchText(foundProperty.name);
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
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

      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setShowSuggestions(false);
        }}
        accessible={false}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/black_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#000000" />

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
                    <Text style={styles.suggestionTitle}>
                      {property.name}
                    </Text>
                    <Text style={styles.suggestionAddress}>
                      {property.address}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.authPanel}>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <LinearGradient
                colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.authButton}
              >
                <Text style={styles.authButtonText}>Kyçu</Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.orText}>OSE</Text>

            <Pressable onPress={() => router.replace("/(auth)/register")}>
              <LinearGradient
                colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.authButton}
              >
                <Text style={styles.authButtonText}>Regjistrohu</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  logoWrapper: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 700,
    height: 185,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 700,
    height: 185,
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 6,
    zIndex: 30,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#000",
    paddingVertical: 0,
  },

  suggestionsBox: {
    position: "absolute",
    top: 188,
    left: 25,
    right: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 7,
    zIndex: 25,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  suggestionTextWrapper: {
    marginLeft: 10,
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },

  suggestionAddress: {
    fontSize: 12,
    color: "#777777",
    marginTop: 2,
  },

  authPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 210,
    backgroundColor: "#000000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 27,
    paddingTop: 36,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 13,
    elevation: 12,
  },

  authButton: {
    width: 386,
    height: 47,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  authButtonText: {
    color: "#FFFFFF",
    fontSize: 20.5,
    fontWeight: "600",
    textAlign: "center",
  },

  orText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 9,
    marginBottom: 10,
  },
});