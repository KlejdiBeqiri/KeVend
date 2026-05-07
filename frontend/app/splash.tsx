import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  const [authChecked, setAuthChecked] = useState(false);
  const isLoggedIn = useRef(false);

  // Check token BEFORE animation finishes
  useEffect(() => {
    AsyncStorage.getItem("accessToken").then((token) => {
      isLoggedIn.current = !!token;
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return; // wait for token check first

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isLoggedIn.current) {
        router.replace("/(tabs)/map");
      } else {
        router.replace("/(guest)/map-guest");
      }
    });
  }, [authChecked]); // fires once auth check resolves

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 220,
    height: 100,
  },
});