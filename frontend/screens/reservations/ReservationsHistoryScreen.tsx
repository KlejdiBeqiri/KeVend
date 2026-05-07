import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ReservationItem = {
  id: string;
  date: string;
  name: string;
  address: string;
  status: "Hapur" | "Mbyllur";
  spots: string;
};

const reservations: ReservationItem[] = [
  {
    id: "1",
    date: "31 Mars 2026",
    name: "Avni Rustemi Parking",
    address: "Sheshi Avni Rustemi, Tiranë",
    status: "Hapur",
    spots: "5 vende",
  },
  {
    id: "2",
    date: "31 Mars 2026",
    name: "Avni Rustemi Parking",
    address: "Sheshi Avni Rustemi, Tiranë",
    status: "Mbyllur",
    spots: "5 vende",
  },
  {
    id: "3",
    date: "11 Mars 2026",
    name: "Avni Rustemi Parking",
    address: "Sheshi Avni Rustemi, Tiranë",
    status: "Hapur",
    spots: "5 vende",
  },
  {
    id: "4",
    date: "11 Mars 2026",
    name: "Avni Rustemi Parking",
    address: "Sheshi Avni Rustemi, Tiranë",
    status: "Mbyllur",
    spots: "5 vende",
  },
];

export default function ReservationsHistoryScreen() {
  const hasNotifications = false;

  const groupedReservations = reservations.reduce<Record<string, ReservationItem[]>>(
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
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Pressable
          style={styles.bellWrapper}
          onPress={() => {
            if (hasNotifications) {
              router.push("/notifications");
            } else {
              router.push("/no-notifications");
            }
          }}
        >
          <Ionicons name="notifications-outline" size={27} color="#fff" />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Rezervime të mëparshme</Text>

        {Object.entries(groupedReservations).map(([date, items]) => (
          <View key={date} style={styles.group}>
            <Text style={styles.dateText}>{date}</Text>

            {items.map((item) => (
              <ReservationCard key={item.id} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReservationCard({ item }: { item: ReservationItem }) {
  const isOpen = item.status === "Hapur";

  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />

      <View style={styles.cardContent}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isOpen ? "#6ACA6A" : "#ED0000" },
            ]}
          >
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>

          <View style={styles.spotsBadge}>
            <Text style={styles.badgeText}>{item.spots}</Text>
          </View>
        </View>

        <Text style={styles.parkingName}>{item.name}</Text>
        <Text style={styles.address}>{item.address}</Text>

        <Pressable style={styles.reserveAgainButton}>
          <Text style={styles.reserveAgainText}>Rezervo Përsëri</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    height: 105,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 135,
    height: 55,
  },

  bellWrapper: {
    position: "absolute",
    right: 28,
    top: 38,
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 115,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
    marginBottom: 18,
    marginLeft: 12,
  },

  group: {
    marginBottom: 12,
  },

  dateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
    marginBottom: 10,
  },

  card: {
    height: 105,
    backgroundColor: "#323232",
    borderRadius: 10,
    flexDirection: "row",
    padding: 8,
    marginBottom: 14,
  },

  imagePlaceholder: {
    width: 115,
    height: 89,
    borderRadius: 8,
    backgroundColor: "#555",
  },

  cardContent: {
    flex: 1,
    marginLeft: 10,
  },

  badgeRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 5,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  spotsBadge: {
    backgroundColor: "#ED0000",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "500",
  },

  parkingName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  address: {
    color: "#9D9D9D",
    fontSize: 10,
    marginTop: 2,
  },

  reserveAgainButton: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reserveAgainText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "600",
  },
});