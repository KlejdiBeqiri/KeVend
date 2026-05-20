import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import colors from "@/constants/colors";
import fonts from "@/constants/fonts";
import { useI18n } from "@/i18n/I18nProvider";
import {
  fetchParkingLots,
  getCachedParkingLots,
  hasFreshParkingLotsCache,
  ParkingLot,
  subscribeParkingChanges,
} from "@/services/parkingService";

type MapExplorerProps = {
  variant: "guest" | "auth";
};

type SortMode = "smart" | "nearest" | "price" | "availability";

type FilterState = {
  availableOnly: boolean;
  openNowOnly: boolean;
  selectedZone: string | null;
  maxPrice: number | null;
  sortMode: SortMode;
};

type DecoratedParkingLot = ParkingLot & {
  computedDistanceKm: number | null;
  computedDrivingDistanceKm: number | null;
  computedDrivingMinutes: number | null;
  computedOpenNow: boolean;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type DriveEstimate = {
  distanceKm: number | null;
  minutes: number | null;
};

type EffectiveParkingStatus = "OPEN" | "FULL" | "CLOSED";

const TIRANA_REGION = {
  latitude: 41.3275,
  longitude: 19.8189,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PRICE_FILTERS = [
  { label: "map.any", value: null as number | null },
  { label: "<= 100 ALL", value: 100 },
  { label: "<= 150 ALL", value: 150 },
  { label: "<= 200 ALL", value: 200 },
  { label: "<= 250 ALL", value: 250 },
];

const SORT_OPTIONS: { label: string; value: SortMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "map.sortNearest", value: "nearest", icon: "navigate-outline" },
  { label: "map.sortCheapest", value: "price", icon: "cash-outline" },
  { label: "map.sortAvailability", value: "availability", icon: "car-sport-outline" },
];

const GOOGLE_MAPS_API_KEY =
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ?? "";

const getDistanceKm = (origin: UserLocation, lot: ParkingLot) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lot.latitude - origin.latitude);
  const dLng = toRadians(lot.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(lot.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

const getFallbackDrivingDistanceKm = (distanceKm: number | null) => {
  if (distanceKm == null) return null;
  return distanceKm < 1 ? distanceKm * 1.15 : distanceKm * 1.28;
};

const getFallbackDrivingMinutes = (drivingDistanceKm: number | null) => {
  if (drivingDistanceKm == null) return null;
  const averageCitySpeedKmPerHour = 28;
  return Math.max(2, Math.round((drivingDistanceKm / averageCitySpeedKmPerHour) * 60));
};

const startsWithSearch = (value: string, text: string) =>
  value
    .toLowerCase()
    .split(" ")
    .some((word) => word.startsWith(text));

const containsSearch = (value: string, text: string) =>
  value.toLowerCase().includes(text);

const matchesQuery = (lot: ParkingLot, text: string) => {
  if (!text) return true;

  return (
    startsWithSearch(lot.name, text) ||
    containsSearch(lot.name, text) ||
    (lot.zone ? startsWithSearch(lot.zone, text) : false) ||
    (lot.zone ? containsSearch(lot.zone, text) : false)
  );
};

const getTimePartsInTirana = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Tirane",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    return { hour, minute };
  } catch {
    const now = new Date();
    return {
      hour: String(now.getHours()).padStart(2, "0"),
      minute: String(now.getMinutes()).padStart(2, "0"),
    };
  }
};

const isOpenNow = (lot: ParkingLot) => {
  if (lot.status === "CLOSED") {
    return false;
  }

  if (!lot.openTime || !lot.closeTime) {
    return true;
  }

  const open = lot.openTime.substring(11, 16);
  const close = lot.closeTime.substring(11, 16);
  const { hour, minute } = getTimePartsInTirana();
  const current = `${hour}:${minute}`;

  if (open <= close) {
    return open <= current && current <= close;
  }

  return current >= open || current <= close;
};

const formatDriveDistance = (
  distanceKm: number | null | undefined,
  minutes: number | null | undefined,
  unavailableLabel: string
) => {
  if (distanceKm == null || minutes == null) {
    return unavailableLabel;
  }

  if (distanceKm < 1) {
    return `${minutes} min drive · ${Math.round(distanceKm * 1000)} m`;
  }

  return `${minutes} min drive · ${distanceKm.toFixed(1)} km`;
};

const formatHours = (lot: ParkingLot, open247Label: string) => {
  if (!lot.openTime || !lot.closeTime) {
    return open247Label;
  }

  return `${lot.openTime.substring(11, 16)} - ${lot.closeTime.substring(11, 16)}`;
};

const getStartingPrice = (lot: ParkingLot) =>
  lot.priceTiers.length > 0 ? Number(lot.priceTiers[0].price) : Number(lot.pricePerHour);

const getEffectiveStatus = (lot: DecoratedParkingLot): EffectiveParkingStatus => {
  if (!lot.computedOpenNow) return "CLOSED";
  if (lot.availableSpots === 0 || lot.status === "FULL") return "FULL";
  if (lot.status === "CLOSED") return "CLOSED";
  return "OPEN";
};

const isAvailableNow = (lot: DecoratedParkingLot) =>
  lot.computedOpenNow && lot.availableSpots > 0 && lot.status !== "CLOSED";

const getStatusTone = (lot: DecoratedParkingLot) => {
  const status = getEffectiveStatus(lot);
  if (status === "CLOSED") return "#5F6B7A";
  if (status === "FULL") return "#5F6B7A";
  if (lot.availableSpots < 10) return "#E34D59";
  return "#22C55E";
};

const getActiveFilterCount = (filters: FilterState) => {
  let count = 0;
  if (filters.availableOnly) count += 1;
  if (filters.openNowOnly) count += 1;
  if (filters.selectedZone) count += 1;
  if (filters.maxPrice != null) count += 1;
  if (filters.sortMode !== "smart") count += 1;
  return count;
};

export default function MapExplorer({ variant }: MapExplorerProps) {
  const { t } = useI18n();
  const mapRef = useRef<MapView | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [driveEstimates, setDriveEstimates] = useState<Record<number, DriveEstimate>>({});
  const [loading, setLoading] = useState(true);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    availableOnly: false,
    openNowOnly: false,
    selectedZone: null,
    maxPrice: null,
    sortMode: "smart",
  });

  const loadParkingData = useCallback(
    async (options?: { force?: boolean; showLoader?: boolean }) => {
      const cached = getCachedParkingLots();
      const shouldUseCachedFirst = !options?.force && cached && cached.length > 0;

      if (shouldUseCachedFirst) {
        setParkingLots(cached);
        setLoading(false);
      } else if (options?.showLoader) {
        setLoading(true);
      }

      if (!options?.force && hasLoadedOnceRef.current && hasFreshParkingLotsCache()) {
        setMapError("");
        return;
      }

      try {
        setMapError("");
        const data = await fetchParkingLots();
        setParkingLots(data);
        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (!shouldUseCachedFirst) {
          setMapError(t("map.loadError"));
        }
        console.warn("Failed to load parking lots", error);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    let cancelled = false;

    const initialCached = getCachedParkingLots();
    if (initialCached && initialCached.length > 0) {
      setParkingLots(initialCached);
      setLoading(false);
      hasLoadedOnceRef.current = true;
    }

    const runInitialLoad = async () => {
      if (cancelled) return;
      await loadParkingData({
        showLoader: !initialCached || initialCached.length === 0,
      });
    };

    void runInitialLoad();
    const unsubscribe = subscribeParkingChanges(() => {
      void loadParkingData({ force: true, showLoader: false });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadParkingData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        return undefined;
      }

      if (!hasFreshParkingLotsCache()) {
        void loadParkingData({ force: true, showLoader: false });
      }

      return undefined;
    }, [loadParkingData])
  );

  const zoneOptions = useMemo(
    () => [...new Set(parkingLots.map((lot) => lot.zone).filter(Boolean))] as string[],
    [parkingLots]
  );

  const decoratedLots = useMemo<DecoratedParkingLot[]>(
    () =>
      parkingLots.map((lot) => {
        const directDistance = userLocation ? getDistanceKm(userLocation, lot) : lot.distanceKm;
        const fallbackDrivingDistance = getFallbackDrivingDistanceKm(directDistance);
        const estimate = driveEstimates[lot.id];

        return {
          ...lot,
          computedDistanceKm: directDistance,
          computedDrivingDistanceKm: estimate?.distanceKm ?? fallbackDrivingDistance,
          computedDrivingMinutes:
            estimate?.minutes ?? getFallbackDrivingMinutes(fallbackDrivingDistance),
          computedOpenNow: isOpenNow(lot),
        };
      }),
    [driveEstimates, parkingLots, userLocation]
  );

  const filteredLots = useMemo(() => {
    const next = decoratedLots.filter((lot) => {
      if (!matchesQuery(lot, deferredQuery)) return false;
      if (filters.availableOnly && !isAvailableNow(lot)) return false;
      if (filters.openNowOnly && !lot.computedOpenNow) return false;
      if (filters.selectedZone && lot.zone !== filters.selectedZone) return false;
      if (filters.maxPrice != null && getStartingPrice(lot) > filters.maxPrice) return false;
      return true;
    });

    next.sort((left, right) => {
      if (filters.sortMode === "nearest") {
        return (left.computedDistanceKm ?? Number.MAX_SAFE_INTEGER) - (right.computedDistanceKm ?? Number.MAX_SAFE_INTEGER);
      }

      if (filters.sortMode === "price") {
        return getStartingPrice(left) - getStartingPrice(right);
      }

      if (filters.sortMode === "availability") {
        return right.availableSpots - left.availableSpots;
      }

      const score = (lot: DecoratedParkingLot) => {
        let value = 0;
        if (getEffectiveStatus(lot) === "OPEN") value += 30;
        if (lot.computedOpenNow) value += 15;
        value += Math.min(lot.availableSpots, 60);
        value -= getStartingPrice(lot) / 10;
        value += lot.distanceKm != null ? Math.max(0, 8 - lot.distanceKm) : 0;
        return value;
      };

      return score(right) - score(left);
    });

    return next;
  }, [decoratedLots, deferredQuery, filters]);

  const suggestions = useMemo(
    () => (deferredQuery ? filteredLots.slice(0, 6) : []),
    [deferredQuery, filteredLots]
  );

  const quickZones = zoneOptions.slice(0, 4);

  const focusOnLot = (lot: ParkingLot) => {
    setSelectedLotId((current) => current ?? lot.id);
    setQuery(lot.name);
    setShowSuggestions(false);
    Keyboard.dismiss();

    mapRef.current?.animateToRegion(
      {
        latitude: lot.latitude,
        longitude: lot.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      500
    );
  };

  const handleLocateMe = useCallback(async (options?: { silent?: boolean }) => {
    try {
      setRefreshingLocation(true);
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission =
        currentPermission.status === "undetermined"
          ? await Location.requestForegroundPermissionsAsync()
          : currentPermission;

      if (permission.status !== "granted") {
        if (!options?.silent) {
          setMapError(t("map.locationPermissionNeeded"));
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setUserLocation(nextLocation);
      setFilters((current) => ({
        ...current,
        sortMode: "nearest",
      }));

      mapRef.current?.animateToRegion(
        {
          ...nextLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        700
      );
    } catch (error) {
      console.warn("Failed to get user location", error);
      if (!options?.silent) {
        setMapError(t("map.locationUnavailable"));
      }
    } finally {
      setRefreshingLocation(false);
    }
  }, [t]);

  useEffect(() => {
    if (variant === "auth") {
      handleLocateMe({ silent: true });
    }
  }, [handleLocateMe, variant]);

  useEffect(() => {
    if (!userLocation || parkingLots.length === 0 || !GOOGLE_MAPS_API_KEY) {
      return;
    }

    let cancelled = false;

    const fetchDriveEstimates = async () => {
      try {
        const destinationBatches: ParkingLot[][] = [];
        for (let index = 0; index < parkingLots.length; index += 20) {
          destinationBatches.push(parkingLots.slice(index, index + 20));
        }

        const nextEstimates: Record<number, DriveEstimate> = {};

        for (const batch of destinationBatches) {
          const destinations = batch
            .map((lot) => `${lot.latitude},${lot.longitude}`)
            .join("|");

          const url =
            "https://maps.googleapis.com/maps/api/distancematrix/json" +
            `?origins=${userLocation.latitude},${userLocation.longitude}` +
            `&destinations=${destinations}` +
            "&mode=driving" +
            "&departure_time=now" +
            `&key=${GOOGLE_MAPS_API_KEY}`;

          const response = await fetch(url);
          const payload = await response.json();

          const elements = payload?.rows?.[0]?.elements;
          if (!Array.isArray(elements)) {
            continue;
          }

          batch.forEach((lot, index) => {
            const element = elements[index];
            if (element?.status !== "OK") {
              return;
            }

            const durationSeconds =
              element.duration_in_traffic?.value ?? element.duration?.value ?? null;
            const distanceMeters = element.distance?.value ?? null;

            nextEstimates[lot.id] = {
              distanceKm:
                typeof distanceMeters === "number" ? distanceMeters / 1000 : null,
              minutes:
                typeof durationSeconds === "number"
                  ? Math.max(1, Math.round(durationSeconds / 60))
                  : null,
            };
          });
        }

        if (!cancelled) {
          setDriveEstimates(nextEstimates);
        }
      } catch (error) {
        console.warn("Failed to load drive estimates", error);
      }
    };

    fetchDriveEstimates();

    return () => {
      cancelled = true;
    };
  }, [parkingLots, userLocation]);

  const handleSearchSubmit = () => {
    if (filteredLots.length > 0) {
      focusOnLot(filteredLots[0]);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      availableOnly: false,
      openNowOnly: false,
      selectedZone: null,
      maxPrice: null,
      sortMode: "smart",
    });
  };

  const activeFilterCount = getActiveFilterCount(filters);

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        provider="google"
        style={styles.map}
        initialRegion={TIRANA_REGION}
        onPress={() => {
          Keyboard.dismiss();
          setShowSuggestions(false);
          setFiltersExpanded(false);
        }}
        showsUserLocation={variant === "auth"}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {decoratedLots.map((lot) => (
          <Marker
            key={lot.id}
            coordinate={{
              latitude: lot.latitude,
              longitude: lot.longitude,
            }}
            pinColor={selectedLotId === lot.id ? "#0B8BFF" : getStatusTone(lot)}
            title={lot.name}
            description={lot.zone ?? ""}
            onPress={() => {
              setFiltersExpanded(false);
              focusOnLot(lot);
            }}
          />
        ))}
      </MapView>

      <LinearGradient
        colors={["rgba(6,10,18,0.9)", "rgba(6,10,18,0.45)", "transparent"]}
        style={styles.headerShade}
        pointerEvents="none"
      />

      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.searchShell}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#7E8CA0" />
          <TextInput
            placeholder={t("map.searchPlaceholder")}
            placeholderTextColor="#7E8CA0"
            style={styles.searchInput}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setShowSuggestions(false);
                setSelectedLotId(null);
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#9AA6B2" />
            </Pressable>
          ) : null}
          <Pressable
            style={styles.filterButton}
            onPress={() => setFiltersExpanded((current) => !current)}
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color="#0D1117" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFilterRow}
        >
          <Pressable
            style={[styles.quickChip, filters.availableOnly && styles.quickChipActive]}
            onPress={() =>
              setFilters((current) => ({
                ...current,
                availableOnly: !current.availableOnly,
              }))
            }
          >
            <Text style={[styles.quickChipText, filters.availableOnly && styles.quickChipTextActive]}>
              {t("map.availableNow")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.quickChip, filters.openNowOnly && styles.quickChipActive]}
            onPress={() =>
              setFilters((current) => ({
                ...current,
                openNowOnly: !current.openNowOnly,
              }))
            }
          >
            <Text style={[styles.quickChipText, filters.openNowOnly && styles.quickChipTextActive]}>
              {t("map.openNow")}
            </Text>
          </Pressable>

          {quickZones.map((zone) => (
            <Pressable
              key={zone}
              style={[styles.quickChip, filters.selectedZone === zone && styles.quickChipActive]}
              onPress={() =>
                setFilters((current) => ({
                  ...current,
                  selectedZone: current.selectedZone === zone ? null : zone,
                }))
              }
            >
              <Text style={[styles.quickChipText, filters.selectedZone === zone && styles.quickChipTextActive]}>
                {zone}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtersExpanded && (
          <View style={styles.filterPanel}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>{t("map.refineMap")}</Text>
              <Pressable onPress={handleClearFilters}>
                <Text style={styles.clearFiltersText}>{t("map.clearAll")}</Text>
              </Pressable>
            </View>

            <Text style={styles.panelLabel}>{t("map.sort")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionPill,
                    filters.sortMode === option.value && styles.optionPillActive,
                  ]}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      sortMode: option.value,
                    }))
                  }
                >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={filters.sortMode === option.value ? "#FFFFFF" : "#607086"}
                  />
                  <Text
                    style={[
                      styles.optionPillText,
                      filters.sortMode === option.value && styles.optionPillTextActive,
                    ]}
                  >
                    {t(option.label)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.panelLabel}>{t("map.price")}</Text>
            <View style={styles.wrapRow}>
              {PRICE_FILTERS.map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.miniPill,
                    filters.maxPrice === option.value && styles.miniPillActive,
                  ]}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      maxPrice: option.value,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.miniPillText,
                      filters.maxPrice === option.value && styles.miniPillTextActive,
                    ]}
                  >
                    {t(option.label)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.panelLabel}>{t("map.zones")}</Text>
            <View style={styles.wrapRow}>
              <Pressable
                style={[styles.miniPill, filters.selectedZone == null && styles.miniPillActive]}
                onPress={() =>
                  setFilters((current) => ({
                    ...current,
                    selectedZone: null,
                  }))
                }
              >
                <Text
                  style={[
                    styles.miniPillText,
                    filters.selectedZone == null && styles.miniPillTextActive,
                  ]}
                >
                  {t("map.allZones")}
                </Text>
              </Pressable>

              {zoneOptions.map((zone) => (
                <Pressable
                  key={zone}
                  style={[
                    styles.miniPill,
                    filters.selectedZone === zone && styles.miniPillActive,
                  ]}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      selectedZone: current.selectedZone === zone ? null : zone,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.miniPillText,
                      filters.selectedZone === zone && styles.miniPillTextActive,
                    ]}
                  >
                    {zone}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((lot) => (
              <Pressable
                key={lot.id}
                style={styles.suggestionItem}
                onPress={() => {
                  setFiltersExpanded(false);
                  focusOnLot(lot);
                }}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: `${getStatusTone(lot)}22` }]}>
                  <Ionicons name="location" size={16} color={getStatusTone(lot)} />
                </View>
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>{lot.name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {t("map.suggestionMeta", {
                      zone: lot.zone ?? t("map.tirana"),
                      spots: lot.availableSpots,
                      price: getStartingPrice(lot),
                    })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable
        style={styles.locateButton}
        onPress={() => {
          setFiltersExpanded(false);
          void handleLocateMe();
        }}
      >
        {refreshingLocation ? (
          <ActivityIndicator size="small" color="#0D1117" />
        ) : (
          <Ionicons name="locate" size={20} color="#0D1117" />
        )}
      </Pressable>

      <View
        style={[
          styles.bottomOverlay,
          variant === "auth" ? styles.bottomOverlayAuth : styles.bottomOverlayGuest,
        ]}
      >

        {variant === "guest" && (
          <View style={styles.guestDock}>
            <View style={styles.guestCopyWrap}>
              <Text style={styles.guestTitle}>{t("map.reserveFaster")}</Text>
              <Text style={styles.guestText}>
                {t("map.reserveFasterText")}
              </Text>
            </View>

            <View style={styles.guestActions}>
              <Pressable onPress={() => router.replace("/(auth)/login")}>
                <LinearGradient
                  colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryGuestButton}
                >
                  <Text style={styles.primaryGuestButtonText}>{t("map.login")}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.secondaryGuestButton} onPress={() => router.replace("/(auth)/register")}>
                <Text style={styles.secondaryGuestButtonText}>{t("map.createAccount")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#DCE7F2", alignItems:"center" },
  map: { ...StyleSheet.absoluteFillObject },
  headerShade: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  logoWrapper: { position: "absolute", top: 47},
  logo: { width: 145, height: 55},
  searchShell: { position: "absolute", top: 120, left: 18, right: 18, zIndex: 20 },
  searchBox: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#0B1324",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    color: "#0D1117",
    fontSize: 14,
    fontFamily: fonts.interRegular,
    paddingVertical: 14,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 10,
    backgroundColor: "#0B8BFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: fonts.interSemiBold },
  quickFilterRow: { paddingTop: 12, paddingBottom: 4, gap: 8 },
  quickChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  quickChipActive: { backgroundColor: "#09101C", borderColor: "#09101C" },
  quickChipText: { color: "#233045", fontSize: 12, fontFamily: fonts.interSemiBold },
  quickChipTextActive: { color: "#FFFFFF" },
  filterPanel: {
    marginTop: 8,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.97)",
    shadowColor: "#0B1324",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterTitle: { color: "#0D1117", fontSize: 16, fontFamily: fonts.interSemiBold },
  clearFiltersText: { color: "#0B8BFF", fontSize: 13, fontFamily: fonts.interSemiBold },
  panelLabel: {
    color: "#4C5B70",
    fontSize: 12,
    fontFamily: fonts.interSemiBold,
    marginBottom: 8,
    marginTop: 4,
  },
  optionRow: { gap: 8, paddingBottom: 10 },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F6FA",
  },
  optionPillActive: { backgroundColor: "#0B8BFF" },
  optionPillText: { color: "#607086", fontSize: 12, fontFamily: fonts.interSemiBold },
  optionPillTextActive: { color: "#FFFFFF" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  miniPill: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  miniPillActive: { backgroundColor: "#101826" },
  miniPillText: { color: "#607086", fontSize: 12, fontFamily: fonts.interRegular },
  miniPillTextActive: { color: "#FFFFFF" },
  suggestionsBox: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.97)",
    overflow: "hidden",
    shadowColor: "#0B1324",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6EDF5",
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTextWrap: { marginLeft: 10, flex: 1 },
  suggestionTitle: { color: "#0D1117", fontSize: 14, fontFamily: fonts.interSemiBold },
  suggestionMeta: { marginTop: 2, color: "#718198", fontSize: 12, fontFamily: fonts.interRegular },
  locateButton: {
    position: "absolute",
    right: 18,
    bottom: 316,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B1324",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: "rgba(10,16,26,0.88)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  bottomOverlayAuth: { bottom: 86 },
  bottomOverlayGuest: { bottom: 0, paddingBottom: 20 },
  resultsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  resultsTitle: { color: "#F7FAFF", fontSize: 20, fontFamily: fonts.interSemiBold },
  resultsSubtitle: {
    marginTop: 4,
    color: "#A9B5C6",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },
  nearbyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(11,139,255,0.14)",
  },
  nearbyBadgeText: { color: "#0A4FA3", fontSize: 12, fontFamily: fonts.interSemiBold },
  inlineError: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(249,115,22,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineErrorText: { flex: 1, color: "#FFD4A8", fontSize: 12, fontFamily: fonts.interRegular },
  loadingCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#F7FAFF",
  },
  loadingText: { color: "#4C5B70", fontSize: 13, fontFamily: fonts.interRegular },
  emptyCard: { marginTop: 16, padding: 18, borderRadius: 24, backgroundColor: "#F7FAFF" },
  emptyTitle: { color: "#0D1117", fontSize: 16, fontFamily: fonts.interSemiBold },
  emptyText: { marginTop: 6, color: "#607086", fontSize: 13, fontFamily: fonts.interRegular },
  cardsRow: { gap: 12, paddingTop: 16 },
  lotCard: { width: 286, borderRadius: 26, overflow: "hidden" },
  lotCardActive: { transform: [{ translateY: -4 }] },
  lotCardGradient: { minHeight: 196, padding: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitleWrap: { flex: 1, paddingRight: 12 },
  lotName: { color: "#0D1117", fontSize: 17, fontFamily: fonts.interSemiBold },
  lotNameActive: { color: "#F7FAFF" },
  lotZone: { marginTop: 4, color: "#64758B", fontSize: 13, fontFamily: fonts.interRegular },
  lotZoneActive: { color: "#B8C6D9" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: fonts.interSemiBold },
  metricRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  metricText: { color: "#607086", fontSize: 12, fontFamily: fonts.interRegular },
  metricTextActive: { color: "#C2D4FF" },
  priceText: { color: "#0B8BFF", fontSize: 16, fontFamily: fonts.interSemiBold },
  priceTextActive: { color: "#FFFFFF" },
  detailsButton: {
    marginTop: 18,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(11,139,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsButtonActive: { backgroundColor: "#F7FAFF" },
  detailsButtonText: { color: "#0B8BFF", fontSize: 13, fontFamily: fonts.interSemiBold },
  detailsButtonTextActive: { color: "#09101C" },
  guestDock: { marginTop: 16, padding: 16, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.08)" },
  guestCopyWrap: { marginBottom: 14 },
  guestTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: fonts.interSemiBold },
  guestText: { marginTop: 6, color: "#A9B5C6", fontSize: 15, fontFamily: fonts.interRegular, marginBottom: 20 },
  guestActions: { flexDirection: "column", gap: 10 },
  primaryGuestButton: {
    minWidth: 124,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryGuestButtonText: { color: colors.white, fontSize: 14, fontFamily: fonts.interSemiBold },
  secondaryGuestButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 20
  },
  secondaryGuestButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: fonts.interSemiBold },
});
