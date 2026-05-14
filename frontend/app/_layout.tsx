import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import GlobalExpiredReservationModal from "@/components/common/GlobalExpiredReservationModal";
import GlobalReservationTimer from "@/components/common/GlobalReservationTimer";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getAccessToken } from "@/services/authService";
import { invalidateNotificationsCache, registerPushToken } from "@/services/notificationsService";
import { invalidateReservationCache } from "@/services/reservationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function PushNotificationsBootstrap() {
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const registerAsync = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          return;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#3080FF",
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          console.warn("Push notifications are not configured yet: missing EAS project id.");
          return;
        }

        const permission = await Notifications.getPermissionsAsync();
        let finalStatus = permission.status;

        if (finalStatus !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          finalStatus = requested.status;
        }

        if (finalStatus !== "granted") {
          console.warn("Push notifications permission was not granted.");
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (!isMounted || !token || registeredToken.current === token) {
          return;
        }

        registeredToken.current = token;
        await registerPushToken({
          token,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        });
      } catch (error) {
        console.warn("Push notification registration skipped", error);
      }
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const type = response.notification.request.content.data?.type;
        const route = response.notification.request.content.data?.route;
        const shouldShowExpiredModal =
          response.notification.request.content.data?.showExpiredReservationModal === true ||
          response.notification.request.content.data?.showExpiredReservationModal === "true";
        invalidateNotificationsCache();
        invalidateReservationCache();

        if (type === "EXPIRY_REACHED" || shouldShowExpiredModal) {
          await AsyncStorage.setItem("showExpiredReservationModal", "1");
          router.push("/(tabs)/home");
          return;
        }

        if (route === "notifications") {
          router.push("/(tabs)/notifications");
        }
      }
    );

    const receivedSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      const type = notification.request.content.data?.type;
      const shouldShowExpiredModal =
        notification.request.content.data?.showExpiredReservationModal === true ||
        notification.request.content.data?.showExpiredReservationModal === "true";
      invalidateNotificationsCache();
      invalidateReservationCache();
      if (type === "EXPIRY_REACHED" || shouldShowExpiredModal) {
        await AsyncStorage.setItem("showExpiredReservationModal", "1");
      }
    });

    registerAsync();

    return () => {
      isMounted = false;
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter_18pt-Regular.ttf"),
    "Inter-Light": require("../assets/fonts/Inter_24pt-Light.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter_28pt-SemiBold.ttf"),
    "Sansation-Light": require("../assets/fonts/Sansation-Light.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <I18nProvider>
      <PushNotificationsBootstrap />
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      <GlobalExpiredReservationModal />
      <GlobalReservationTimer />
    </I18nProvider>
  );
}
