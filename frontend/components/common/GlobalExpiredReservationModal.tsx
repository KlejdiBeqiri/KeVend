import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/i18n/I18nProvider";

const EXPIRED_MODAL_FLAG_KEY = "showExpiredReservationModal";

export default function GlobalExpiredReservationModal() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        const shouldShow = await AsyncStorage.getItem(EXPIRED_MODAL_FLAG_KEY);
        if (!mounted || shouldShow !== "1") {
          return;
        }

        setVisible(true);
        await AsyncStorage.removeItem(EXPIRED_MODAL_FLAG_KEY);
      } catch {
        // Keep the UI resilient if local storage is temporarily unavailable.
      }
    };

    void checkFlag();
    const intervalId = setInterval(() => {
      void checkFlag();
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={52} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{t("expiredReservation.title")}</Text>
          <Text style={styles.body}>{t("expiredReservation.body")}</Text>

          <Pressable style={styles.button} onPress={() => setVisible(false)}>
            <Text style={styles.buttonText}>{t("common.ok")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(237,0,0,0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 26,
    alignItems: "center",
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#ED0000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    color: "#000000",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  button: {
    backgroundColor: "#ED0000",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
