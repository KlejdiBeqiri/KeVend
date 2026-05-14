import React from "react";
import { Image, SafeAreaView, StyleSheet, Text, View } from "react-native";

import BackButton from "../../components/common/BackButton";
import BottomTabBar from "../../components/navigation/BottomTabBar";
import fonts from "../../constants/fonts";
import { useI18n } from "@/i18n/I18nProvider";

export default function NoInvoicesScreen() {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>{t("invoices.title")}</Text>

      <View style={styles.emptyContainer}>
        <Image
          source={require("../../assets/invoice.png")}
          style={styles.emptyImage}
          resizeMode="contain"
        />

        <Text style={styles.emptyText}>{t("invoices.empty")}</Text>
      </View>

      <BottomTabBar activeTab="account" />
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
    width: 145,
    height: 55,
  },
  title: {
    position: "absolute",
    top: 155,
    left: 32,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: 0,
    color: "#FFFFFF",
    fontFamily: fonts.interRegular,
  },
  emptyContainer: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
  },
  emptyImage: {
    width: 145,
    height: 130,
    marginTop: 100,
    marginBottom: 35,
  },
  emptyText: {
    width: 396,
    maxWidth: "90%",
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: 0,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: fonts.interRegular,
  },
});
