import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import fonts from "@/constants/fonts";
import { useI18n } from "@/i18n/I18nProvider";
import {
  fetchMyPayments,
  getCachedPayments,
  PaymentData,
  subscribePaymentChanges,
} from "@/services/paymentService";

const formatDate = (value: string | null | undefined, locale: "sq" | "en") => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(locale === "sq" ? "sq-AL" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function InvoicesScreen() {
  const { locale, t } = useI18n();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedPayments();
    if (cached) {
      setPayments(cached);
      setLoading(false);
    }

    const loadPayments = async () => {
      try {
        const data = await fetchMyPayments();
        if (!cancelled) {
          setPayments(data);
        }
      } catch (error) {
        console.warn("Failed to load invoices", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPayments();
    const unsubscribe = subscribePaymentChanges(() => {
      void loadPayments();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#3080FF" />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../assets/invoice.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />

          <Text style={styles.emptyText}>{t("invoices.empty")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {payments.map((payment) => (
            <View key={payment.id} style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {payment.parkingName ?? t("invoices.parkingPayment")}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {payment.vehiclePlate
                    ? t("invoices.plateLabel", { plate: payment.vehiclePlate })
                    : t("invoices.reservation")}
                </Text>
                <Text style={styles.cardMeta}>
                  {formatDate(payment.paidAt ?? payment.createdAt, locale)}
                </Text>
              </View>

              <View style={styles.amountWrap}>
                <Text style={styles.amountText}>
                  {payment.amount} {payment.currency}
                </Text>
                <Text style={styles.providerText}>{payment.provider}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    color: "#FFFFFF",
    fontFamily: fonts.interRegular,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: fonts.interRegular,
  },
  scrollContent: {
    paddingTop: 220,
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2A77F1",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.interSemiBold,
  },
  cardSubtitle: {
    marginTop: 4,
    color: "#A3A3A3",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },
  cardMeta: {
    marginTop: 6,
    color: "#737373",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },
  amountWrap: {
    alignItems: "flex-end",
  },
  amountText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  providerText: {
    marginTop: 4,
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },
});
