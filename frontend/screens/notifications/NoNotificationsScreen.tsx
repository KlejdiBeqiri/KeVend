import React from "react";
import { Image, SafeAreaView, StyleSheet, Text, View } from "react-native";

import BackButton from "@/components/common/BackButton";

export default function NoNotificationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* BACK BUTTON */}
      <BackButton />

      {/* LOGO */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* TITLE */}
      <Text style={styles.title}>Njoftime</Text>

      {/* EMPTY STATE */}
      <View style={styles.emptyContainer}>
        <Image
          source={require("../../assets/notifications.png")}
          style={styles.emptyImage}
          resizeMode="contain"
        />

        <Text style={styles.emptyText}>
          Ju nuk keni asnje njoftim per momentin.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  logoContainer: {
    position: "absolute",
    top: 55,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 150,
    height: 70,
  },

  title: {
    position: "absolute",
    top: 155,
    left: 32,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -1,
    color: "#FFFFFF",
  },

  emptyContainer: {
    position: "absolute",
    top: "39%",
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
  },

  emptyImage: {
    width: 100,
    height: 100,
    marginTop: 100,
    marginBottom: 35,
  },

  emptyText: {
    width: 396,
    maxWidth: "90%",
    fontSize: 14,
    lineHeight: 27,
    letterSpacing: -1,
    color: "#FFFFFF",
    textAlign: "center",
  },
});