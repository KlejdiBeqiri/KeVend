import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

const tabs = [
  { name: "map", icon: "map-outline", family: "material" },
  { name: "reservation-history", icon: "list-outline", family: "ion" },
  { name: "home", icon: "home-outline", family: "ion" },
  { name: "account", icon: "person-outline", family: "ion" },
];

type TabItemProps = {
  tab: (typeof tabs)[number];
  isActive: boolean;
  onPress: () => void;
};

function TabItem({ tab, isActive, onPress }: TabItemProps) {
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.08 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
  }, [isActive]);

  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Animated.View
        style={[
          styles.activePill,
          { opacity: bgAnim },
        ]}
      />
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
    </Pressable>
  );
}

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <LinearGradient
      colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
      locations={[0, 0.378, 0.6298, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = state.routes[state.index]?.name === tab.name;

        return (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={isActive}
            onPress={() => navigation.navigate(tab.name)}
          />
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
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    width: 69,
    height: 43,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.36)",
    borderRadius: 50,
  },
});