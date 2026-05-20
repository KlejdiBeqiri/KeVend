import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function ScreenHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 30
  },

  logo: {
    width: 145,
    height: 55,
  },
});