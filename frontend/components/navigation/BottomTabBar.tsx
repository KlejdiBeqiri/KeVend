import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

const tabs = [
  { name: "map", icon: "map-outline", family: "material" },
  { name: "home", icon: "list-outline", family: "ion" },
  { name: "notifications", icon: "notifications-outline", family: "ion" },
  { name: "account", icon: "person-outline", family: "ion" },
];

const PILL_WIDTH = 69;
const PILL_HEIGHT = 43;

// ── Per-icon scale animation ──────────────────────────────────────────────────
function TabIcon({
  tab,
  isActive,
}: {
  tab: (typeof tabs)[number];
  isActive: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.08 : 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 7,
    }).start();
  }, [isActive, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {tab.family === "material" ? (
        <MaterialCommunityIcons
          name={tab.icon as any}
          size={26}
          color="#FFFFFF"
        />
      ) : (
        <Ionicons name={tab.icon as any} size={26} color="#FFFFFF" />
      )}
    </Animated.View>
  );
}

// ── Main tab bar ──────────────────────────────────────────────────────────────
export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const activeIndex = tabs.findIndex(
    (t) => t.name === state.routes[state.index]?.name
  );

  // Tracks measured container width so we can place the pill precisely
  const [containerWidth, setContainerWidth] = useState(0);

  // Single animated value: current "index position" of the pill
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      // Apple-feel: snappy but with a tiny overshoot
      speed: 18,
      bounciness: 9,
    }).start();
  }, [activeIndex, slideAnim]);

  // Each tab occupies (containerWidth / tabCount) of space.
  // The pill's left edge = sectionCenter − pillWidth/2.
  const tabWidth = containerWidth / tabs.length;

  const translateX =
    containerWidth > 0
      ? slideAnim.interpolate({
          inputRange: tabs.map((_, i) => i),
          outputRange: tabs.map(
            (_, i) => tabWidth * i + tabWidth / 2 - PILL_WIDTH / 2
          ),
        })
      : new Animated.Value(0);

  return (
    <LinearGradient
      colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
      locations={[0, 0.378, 0.6298, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* ── Single sliding pill ── */}
      {containerWidth > 0 && (
        <Animated.View
          style={[styles.slidingPill, { transform: [{ translateX }] }]}
        />
      )}

      {/* ── Tab buttons (icons on top of the pill layer) ── */}
      {tabs.map((tab) => {
        const isActive = state.routes[state.index]?.name === tab.name;

        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tab}
          >
            <TabIcon tab={tab} isActive={isActive} />
          </Pressable>
        );
      })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 17,
    left: 40,
    right: 40,
    height: 61,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    // Required so the pill never bleeds outside the rounded bar
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    height: PILL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  slidingPill: {
    position: "absolute",
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
});
