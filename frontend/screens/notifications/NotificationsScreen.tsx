import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";

type NotificationItem = {
  id: string;
  date: string;
  name: string;
  time: string;
  message: string;
};

const notifications: NotificationItem[] = [
  {
    id: "1",
    date: "31 Mars 2026",
    name: "Emri Mbiemri",
    time: "09:30 e paradites",
    message: "Rezervimi juaj sapo u krye. Nxito për të zënë vendin.",
  },
  {
    id: "2",
    date: "11 Mars 2026",
    name: "Emri Mbiemri",
    time: "10:00 e paradites",
    message:
      "Numri personal i parkimit tuaj është #123456, përdoreni për kryer pagesën.",
  },
];

export default function NotificationsScreen() {
  const groupedNotifications = notifications.reduce<Record<string, NotificationItem[]>>(
    (groups, item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }

      groups[item.date].push(item);
      return groups;
    },
    {}
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />

        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Njoftime</Text>

        {Object.entries(groupedNotifications).map(([date, items]) => (
          <View key={date} style={styles.group}>
            <Text style={styles.dateText}>{date}</Text>

            <View style={styles.notificationsBox}>
              {items.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.notificationRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="notifications-outline"
                        size={24}
                        color="#fff"
                      />
                    </View>

                    <View style={styles.textContainer}>
                      <View style={styles.rowHeader}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.time}>{item.time}</Text>
                      </View>

                      <Text style={styles.message}>{item.message}</Text>
                    </View>
                  </View>

                  {index !== items.length - 1 && <View style={styles.line} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 145,
    height: 60,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "400",
    marginLeft: 25,
    marginBottom: 18,
  },

  group: {
    marginBottom: 14,
  },

  dateText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 25,
    marginBottom: 8,
  },

  notificationsBox: {
    backgroundColor: "#323232",
    paddingVertical: 10,
  },

  notificationRow: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2A77F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },

  textContainer: {
    flex: 1,
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
  },

  time: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "400",
  },

  message: {
    color: "rgba(209, 209, 209, 0.78)",
    fontSize: 14,
    lineHeight: 16,
    marginTop: 4,
    paddingRight: 8,
  },

  line: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.27)",
    marginLeft: 85,
    marginRight: 15,
  },
});