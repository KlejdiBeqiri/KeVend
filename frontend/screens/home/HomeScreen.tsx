import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  fetchMyHistory,
  ReservationData,
} from "@/services/reservationService";
import { fetchParkingLots, ParkingLot } from "@/services/parkingService";


export default function HomeScreen() {

  // Data from backend
  const [activeReservation, setActiveReservation] =
    useState<ReservationData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [partnerParkings, setPartnerParkings] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);

  const hasNotifications = false;

  // ── Fetch data from backend on every focus ──
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);

          // Fetch reservation history and pick the active one
          const [history, parkings] = await Promise.all([
            fetchMyHistory().catch(() => [] as ReservationData[]),
            fetchParkingLots({ availableOnly: true }).catch(
              () => [] as ParkingLot[]
            ),
          ]);

          if (cancelled) return;

          // Find the most recent CONFIRMED or SOFT_HOLD reservation
          const active = history.find(
            (r) => r.status === "CONFIRMED" || r.status === "SOFT_HOLD"
          );
          setActiveReservation(active ?? null);
          setPartnerParkings(parkings.slice(0, 4)); // show up to 4 partner cards
        } catch (err) {
          console.warn("Failed to load home data", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ── Compute remaining time ──
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    
    if (activeReservation?.holdExpiresAt) {
      const expirationDate = new Date(activeReservation.holdExpiresAt).getTime();
      
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((expirationDate - Date.now()) / 1000));
        setSecondsLeft(remaining);
        
        // If the timer reaches 0, you could optionally refetch or clear the active reservation
        if (remaining <= 0) {
          setActiveReservation(null);
          setSecondsLeft(null);
          if (timer) clearInterval(timer);
        }
      };
      
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setSecondsLeft(null);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeReservation]);

  const timeText = secondsLeft !== null 
    ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`
    : "";


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

          <Pressable
            style={styles.bellWrapper}
            onPress={() => {
              if (hasNotifications) {
                router.push("(screens)/notifications");
              } else {
                router.push("(screens)/no-notifications");
              }
            }}
          >
            <Ionicons name="notifications-outline" size={28} color="#fff" />
            {hasNotifications && <View style={styles.notificationDot} />}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Rezervimi Aktual</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#ED0000"
            style={{ marginVertical: 20 }}
          />
        ) : activeReservation ? (
          <View style={styles.currentCard}>
            <View style={styles.imagePlaceholder} />

            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>
                {activeReservation.parkingName}
              </Text>
              <Text style={styles.currentAddress}>
                {activeReservation.totalCost
                  ? `${activeReservation.totalCost} ALL`
                  : ""}
              </Text>




              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {activeReservation.status === "CONFIRMED"
                    ? "Konfirmuar"
                    : "Në pritje"}
                </Text>
              </View>
            </View>

            <View style={styles.spotsBadge}>
              <Text style={styles.spotsText}>
                {activeReservation.spotsReserved} vende
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.currentCard}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>
                Nuk keni rezervim aktual
              </Text>
              <Text style={styles.currentAddress}>
                Shkoni te harta për të gjetur një parkim
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Bashkëpunimet Tona</Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="#ED0000"
            style={{ marginVertical: 20 }}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {partnerParkings.map((lot) => (
              <Pressable
                key={lot.id}
                onPress={() =>
                  router.push({
                    pathname: "/parking-detail",
                    params: { parkingId: String(lot.id) },
                  })
                }
              >
                <PartnerCard
                  spaces={`${lot.availableSpots} vende të lira`}
                  spacesColor={lot.availableSpots > 5 ? "#6ACA6A" : "#ED0000"}
                  name={lot.name}
                  address={lot.zone ?? ""}
                  price={`${lot.pricePerHour}ALL/ Ora`}
                />
              </Pressable>
            ))}

            {partnerParkings.length === 0 && (
              <Text style={{ color: "#9D9D9D", marginLeft: 10 }}>
                Nuk u gjetën parkime.
              </Text>
            )}
          </ScrollView>
        )}
      </ScrollView>

      {/* Draggable countdown rendered outside ScrollView so it floats freely */}
      {activeReservation && secondsLeft !== null && (
        <DraggableCountdown secondsLeft={secondsLeft} timeText={timeText} />
      )}
    </SafeAreaView>
  );
}

// ─── Draggable Countdown ───────────────────────────────────────────────────────

function DraggableCountdown({
  secondsLeft,
  timeText,
}: {
  secondsLeft: number;
  timeText: string;
}) {
  const WIDGET_SIZE = 82;
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const SNAP_MARGIN = 12;

  // Top boundary: below the header (~90px from top)
  const MIN_Y = 90;
  // Bottom boundary: tab bar is 61px tall, sits 17px from bottom → 78px total.
  const MAX_Y = SCREEN_HEIGHT - WIDGET_SIZE - 78 - 10;

  const initialX = SCREEN_WIDTH - WIDGET_SIZE - SNAP_MARGIN;
  const initialY = 130;

  const pan = React.useRef(
    new Animated.ValueXY({ x: initialX, y: initialY })
  ).current;
  const panRef = React.useRef({ x: initialX, y: initialY });

  React.useEffect(() => {
    const id = pan.addListener((val) => {
      panRef.current = val;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const clampY = (y: number) => Math.min(Math.max(y, MIN_Y), MAX_Y);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: panRef.current.x, y: panRef.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        pan.x.setValue(panRef.current.x + gesture.dx - panRef.current.x);
        const offsetY = (pan.y as any)._offset ?? 0;
        pan.y.setValue(
          Math.min(
            Math.max(gesture.dy, MIN_Y - offsetY),
            MAX_Y - offsetY
          )
        );
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();

        const currentX = panRef.current.x;
        const currentY = clampY(panRef.current.y);

        const snapX =
          currentX + WIDGET_SIZE / 2 < SCREEN_WIDTH / 2
            ? SNAP_MARGIN
            : SCREEN_WIDTH - WIDGET_SIZE - SNAP_MARGIN;

        Animated.spring(pan, {
          toValue: { x: snapX, y: currentY },
          useNativeDriver: false,
          friction: 6,
          tension: 80,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggableContainer,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <CountdownRing secondsLeft={secondsLeft} />
      <Text style={styles.countdownText}>{timeText}</Text>
    </Animated.View>
  );
}

// ─── Countdown Ring ────────────────────────────────────────────────────────────

function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const size = 82;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use 10 minutes (600 seconds) as the max for the ring
  const TOTAL_SECONDS = 10 * 60;
  const progress = secondsLeft / TOTAL_SECONDS;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(106,202,106,0.2)"
        strokeWidth={strokeWidth}
        fill="#000"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(106,202,106,0.9)"
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


// ─── Partner Card ──────────────────────────────────────────────────────────────

function PartnerCard({ spaces, spacesColor, name, address, price }: any) {
  return (
    <View style={styles.partnerCard}>
      <View style={styles.partnerImagePlaceholder} />

      <View style={[styles.partnerBadge, { backgroundColor: spacesColor }]}>
        <Text style={styles.partnerBadgeText}>{spaces}</Text>
      </View>

      <Text style={styles.partnerName}>{name}</Text>
      <Text style={styles.partnerAddress}>{address}</Text>
      <Text style={styles.partnerPrice}>{price}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  header: {
    top: -25,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 145,
    height: 60,
  },

  bellWrapper: {
    position: "absolute",
    right: 10,
    top: 20,
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

  // Draggable floating widget
  draggableContainer: {
    position: "absolute",
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  countdownText: {
    position: "absolute",
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 26,
    marginTop: 25,
    marginBottom: 15,
  },

  currentCard: {
    backgroundColor: "#323232",
    borderRadius: 15,
    flexDirection: "row",
    padding: 10,
    height: 130,
  },

  imagePlaceholder: {
    width: 120,
    height: 110,
    borderRadius: 10,
    backgroundColor: "#555",
  },

  currentInfo: {
    marginLeft: 10,
    flex: 1,
  },

  currentName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  currentAddress: {
    color: "#9D9D9D",
    fontSize: 12,
    marginTop: 5,
  },

  statusBadge: {
    marginTop: 55,
    backgroundColor: "rgba(106,202,106,0.3)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },

  statusText: {
    color: "#54E754",
    fontSize: 11,
  },

  spotsBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(237,0,0,0.7)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  spotsText: {
    color: "#fff",
    fontSize: 10,
  },

  partnerCard: {
    width: 170,
    backgroundColor: "#323232",
    borderRadius: 15,
    padding: 8,
    marginRight: 15,
  },

  partnerImagePlaceholder: {
    height: 90,
    borderRadius: 8,
    backgroundColor: "#555",
  },

  partnerBadge: {
    marginTop: -15,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  partnerBadgeText: {
    color: "#fff",
    fontSize: 8,
  },

  partnerName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },

  partnerAddress: {
    color: "#9D9D9D",
    fontSize: 10,
  },

  partnerPrice: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  expiredModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 26,
    alignItems: "center",
  },

  expiredCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#ED0000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  expiredTitle: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  expiredText: {
    color: "#000000",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },

  okButton: {
    backgroundColor: "#ED0000",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 24,
  },

  okButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});