import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useI18n } from "@/i18n/I18nProvider";
import { getAccessToken } from "@/services/authService";
import { fetchParkingById, ParkingLot } from "@/services/parkingService";
import { registerReservationOverlayHandler } from "@/services/reservationOverlay";
import {
  fetchCurrentReservation,
  ReservationData,
  subscribeReservationChanges,
} from "@/services/reservationService";

const SOFT_HOLD_TOTAL_SECONDS = 10 * 60;
const TIMER_SIZE = 90;
const SNAP_MARGIN = 12;
const DEFAULT_TOP = 130;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MIN_Y = 90;
const MAX_Y = SCREEN_HEIGHT - TIMER_SIZE - 88;
const ACTIVE_RESERVATION_SNAPSHOT_KEY = "activeReservationSnapshot";

function getTimerTarget(reservation: ReservationData | null) {
  if (!reservation) {
    return null;
  }

  if (reservation.status === "CONFIRMED" && reservation.endTime) {
    return reservation.endTime;
  }

  return null;
}

function formatTime(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TimerRing({ secondsLeft }: { secondsLeft: number }) {
  const size = TIMER_SIZE;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / SOFT_HOLD_TOTAL_SECONDS));
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={strokeWidth}
        fill="rgba(8,17,28,0.98)"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#6ACA6A"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}

async function openGoogleMapsRoute(parking: ParkingLot) {
  const destination = `${parking.latitude},${parking.longitude}`;
  const nativeGoogleMapsUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?daddr=${destination}&directionsmode=driving`
      : `google.navigation:q=${destination}&mode=d`;
  const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  const canOpenNative = await Linking.canOpenURL(nativeGoogleMapsUrl);
  await Linking.openURL(canOpenNative ? nativeGoogleMapsUrl : browserFallbackUrl);
}

export default function GlobalReservationTimer() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const sheetScale = useRef(new Animated.Value(0.96)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef({ x: SCREEN_WIDTH - TIMER_SIZE - SNAP_MARGIN, y: DEFAULT_TOP });
  const movedRef = useRef(false);
  const timerPosition = useState(
    () =>
      new Animated.ValueXY({
        x: SCREEN_WIDTH - TIMER_SIZE - SNAP_MARGIN,
        y: DEFAULT_TOP,
      })
  )[0];
  const timerPositionRef = useState(() => ({
    x: SCREEN_WIDTH - TIMER_SIZE - SNAP_MARGIN,
    y: DEFAULT_TOP,
  }))[0];

  useEffect(() => {
    const id = timerPosition.addListener((value) => {
      timerPositionRef.x = value.x;
      timerPositionRef.y = value.y;
    });

    return () => timerPosition.removeListener(id);
  }, [timerPosition, timerPositionRef]);

  useEffect(() => {
    registerReservationOverlayHandler(() => setDetailsVisible(true));
    return () => registerReservationOverlayHandler(null);
  }, []);

  useEffect(() => {
    if (!detailsVisible) {
      sheetScale.setValue(0.96);
      sheetOpacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(sheetScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [detailsVisible, sheetOpacity, sheetScale]);

  useEffect(() => {
    let cancelled = false;

    const hydrateSnapshot = async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_RESERVATION_SNAPSHOT_KEY);
        if (!raw || cancelled) {
          return;
        }

        const snapshot = JSON.parse(raw) as ReservationData;
        const snapshotTarget = getTimerTarget(snapshot);
        if (snapshotTarget && new Date(snapshotTarget).getTime() > Date.now()) {
          setReservation(snapshot);
        } else {
          await AsyncStorage.removeItem(ACTIVE_RESERVATION_SNAPSHOT_KEY);
        }
      } catch {
        await AsyncStorage.removeItem(ACTIVE_RESERVATION_SNAPSHOT_KEY);
      }
    };

    const loadReservation = async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setReservation(null);
          setParking(null);
        }
        await AsyncStorage.removeItem(ACTIVE_RESERVATION_SNAPSHOT_KEY);
        return;
      }

      try {
        const currentReservation = await fetchCurrentReservation();
        if (cancelled) {
          return;
        }

        setReservation(currentReservation);

        if (
          currentReservation &&
          currentReservation.status === "CONFIRMED" &&
          getTimerTarget(currentReservation)
        ) {
          await AsyncStorage.setItem(
            ACTIVE_RESERVATION_SNAPSHOT_KEY,
            JSON.stringify(currentReservation)
          );
        } else {
          await AsyncStorage.removeItem(ACTIVE_RESERVATION_SNAPSHOT_KEY);
        }

        if (
          currentReservation?.parkingId &&
          currentReservation.status === "CONFIRMED"
        ) {
          try {
            const parkingDetails = await fetchParkingById(currentReservation.parkingId);
            if (!cancelled) {
              setParking(parkingDetails);
            }
          } catch {
            if (!cancelled) {
              setParking(null);
            }
          }
        } else if (!cancelled) {
          setParking(null);
        }
      } catch {
        // Keep the last valid timer state on transient fetch errors so the
        // bubble does not flicker during app reopen or short network drops.
      }
    };

    const unsubscribe = subscribeReservationChanges(() => {
      void loadReservation();
    });

    void hydrateSnapshot();
    void loadReservation();
    const intervalId = setInterval(() => {
      void loadReservation();
    }, 10000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const timerTarget = useMemo(() => getTimerTarget(reservation), [reservation]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setPressed(true);
          movedRef.current = false;
          dragStartRef.current = {
            x: timerPositionRef.x,
            y: timerPositionRef.y,
          };
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) {
            movedRef.current = true;
          }

          const nextX = dragStartRef.current.x + gesture.dx;
          const nextY = Math.min(Math.max(dragStartRef.current.y + gesture.dy, MIN_Y), MAX_Y);
          timerPosition.setValue({ x: nextX, y: nextY });
        },
        onPanResponderRelease: () => {
          const currentX = timerPositionRef.x;
          const currentY = Math.min(Math.max(timerPositionRef.y, MIN_Y), MAX_Y);
          const snapX =
            currentX + TIMER_SIZE / 2 < SCREEN_WIDTH / 2
              ? SNAP_MARGIN
              : SCREEN_WIDTH - TIMER_SIZE - SNAP_MARGIN;

          Animated.spring(timerPosition, {
            toValue: { x: snapX, y: currentY },
            useNativeDriver: false,
            friction: 6,
            tension: 80,
          }).start();

          if (!movedRef.current) {
            setPressed(false);
            setDetailsVisible(true);
            return;
          }

          setPressed(false);
        },
        onPanResponderTerminate: () => {
          setPressed(false);
        },
      }),
    [timerPosition, timerPositionRef]
  );

  useEffect(() => {
    if (!timerTarget) {
      setSecondsLeft(null);
      return;
    }

    const targetTime = new Date(timerTarget).getTime();
    const update = () => {
      const remaining = Math.max(
        0,
        Math.min(SOFT_HOLD_TOTAL_SECONDS, Math.floor((targetTime - Date.now()) / 1000))
      );
      setSecondsLeft(remaining);
    };

    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [timerTarget]);

  if (
    pathname === "/splash" ||
    !timerTarget ||
    secondsLeft === null ||
    secondsLeft <= 0 ||
    !reservation
  ) {
    return null;
  }

  return (
    <>
      <View pointerEvents="box-none" style={styles.overlay}>
        <Animated.View
          style={[
            styles.timerButton,
            {
              transform: [{ translateX: timerPosition.x }, { translateY: timerPosition.y }],
              opacity: pressed ? 0.96 : 1,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TimerRing secondsLeft={secondsLeft} />
          <View style={styles.centerContent}>
            <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
          </View>
        </Animated.View>
      </View>

      <Modal transparent visible={detailsVisible} animationType="fade">
        <View style={styles.sheetOverlay}>
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: sheetOpacity,
                transform: [{ scale: sheetScale }],
              },
            ]}
          >
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {reservation.parkingName ?? t("timer.currentReservation")}
              </Text>
              <Pressable style={styles.closeButton} onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={18} color="#0F172A" />
              </Pressable>
            </View>
            <Text style={styles.sheetSubtitle}>
              {t("timer.reservationActive", { time: formatTime(secondsLeft) })}
            </Text>

            <View style={styles.sheetMetaCard}>
              <Text style={styles.sheetMetaLabel}>{t("reservation.feeLabel")}</Text>
              <Text style={styles.sheetMetaValue}>{reservation.totalCost} ALL</Text>
            </View>

            <Pressable
              style={styles.primaryAction}
              onPress={async () => {
                if (parking) {
                  await openGoogleMapsRoute(parking);
                } else if (reservation.parkingId) {
                  router.push({
                    pathname: "/parking-detail",
                    params: { parkingId: String(reservation.parkingId) },
                  });
                }
                setDetailsVisible(false);
              }}
            >
              <Ionicons name="navigate-outline" size={18} color="#08111C" />
              <Text style={styles.primaryActionText}>{t("common.openInGoogleMaps")}</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryAction}
              onPress={() => {
                if (reservation.parkingId) {
                  router.push({
                    pathname: "/parking-detail",
                    params: { parkingId: String(reservation.parkingId) },
                  });
                } else {
                  router.push("/(tabs)/home");
                }
                setDetailsVisible(false);
              }}
            >
              <Text style={styles.secondaryActionText}>{t("timer.openDetails")}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  timerButton: {
    position: "absolute",
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
  },
  sheetSubtitle: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  sheetMetaCard: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    padding: 16,
  },
  sheetMetaLabel: {
    color: "#B8C7DA",
    fontSize: 12,
  },
  sheetMetaValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  primaryAction: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#D7E7FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryActionText: {
    color: "#08111C",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryAction: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D7E0EC",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
});
