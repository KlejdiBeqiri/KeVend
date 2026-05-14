import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { invalidateParkingCache, ParkingLot } from "@/services/parkingService";
import {
  capturePayPalOrder,
  createPayPalOrder,
  PaymentCurrency,
} from "@/services/paymentService";
import {
  addPaymentMethod,
  addVehicle,
  fetchMyProfile,
  invalidateProfileCache,
  UserPaymentMethod,
  UserProfile,
  UserVehicle,
} from "@/services/profileService";
import { invalidateNotificationsCache } from "@/services/notificationsService";
import {
  cancelReservation,
  confirmReservationForTesting,
  createSoftHold,
  invalidateReservationCache,
} from "@/services/reservationService";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  onReservationSuccess?: () => void;
  parkingId?: number;
  parking?: ParkingLot | null;
};

const ALL_PER_EUR = 95.53;
const RESERVATION_FEE_ALL = 50;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const formatEmailForWrap = (value: string) => value.replace("@", "@\u200b");

function getReservationAmount() {
  return RESERVATION_FEE_ALL;
}

function getEstimatedEurAmount(amountInAll: number) {
  if (!amountInAll || amountInAll <= 0) {
    return "0.00";
  }

  return (amountInAll / ALL_PER_EUR).toFixed(2);
}

export default function ReservingModal({
  visible,
  onClose,
  onReservationSuccess,
  parkingId,
  parking,
}: Props) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<UserVehicle | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<UserPaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [resultType, setResultType] = useState<"success" | "error">("success");
  const [errorMessage, setErrorMessage] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newPayPalEmail, setNewPayPalEmail] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const plateInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingProfile(true);
        const nextProfile = await fetchMyProfile();
        if (cancelled) return;

        setProfile(nextProfile);
        setSelectedVehicle(
          nextProfile.vehicles.find((item) => item.primaryVehicle) ?? nextProfile.vehicles[0] ?? null
        );
        setSelectedPaymentMethod(
          nextProfile.paymentMethods.find((item) => item.primaryMethod) ??
            nextProfile.paymentMethods[0] ??
            null
        );
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(t("reservation.loadSetupError"));
          setResultType("error");
          setResultVisible(true);
        }
        console.warn("Failed to load reservation setup", err);
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, visible]);

  const totalCost = useMemo(() => getReservationAmount(), []);
  const estimatedEur = useMemo(() => getEstimatedEurAmount(totalCost), [totalCost]);

  const closeResult = () => {
    setResultVisible(false);

    if (resultType === "success") {
      router.push("/(tabs)/home");
    }
  };

  const handleAddVehicle = async () => {
    const normalizedPlate = newPlate.trim().toUpperCase();
    if (!normalizedPlate || addingVehicle) return;

    const existingVehicle = vehicles.find((item) => item.plate.toUpperCase() === normalizedPlate);
    if (existingVehicle) {
      setSelectedVehicle(existingVehicle);
      setNewPlate("");
      return;
    }

    try {
      setAddingVehicle(true);
      const created = await addVehicle({
        plate: normalizedPlate,
        primaryVehicle: vehicles.length === 0,
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              vehicles: [created, ...current.vehicles],
            }
          : current
      );
      setSelectedVehicle(created);
      setNewPlate("");
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ?? t("reservation.savePlateError")
      );
      setResultType("error");
      setResultVisible(true);
    } finally {
      setAddingVehicle(false);
    }
  };

  const handlePlateInputDone = () => {
    plateInputRef.current?.blur();
    void handleAddVehicle();
  };

  const handleAddPaymentMethod = async () => {
    const normalizedEmail = newPayPalEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage(t("reservation.enterPaypalFirst"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage(t("reservation.invalidPaypal"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    try {
      setAddingPaymentMethod(true);
      const created = await addPaymentMethod({
        provider: "PAYPAL",
        accountEmail: normalizedEmail,
        displayLabel: normalizedEmail,
        primaryMethod: paymentMethods.length === 0,
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              paymentMethods: [created, ...current.paymentMethods],
            }
          : current
      );
      setSelectedPaymentMethod(created);
      setNewPayPalEmail("");
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ?? t("reservation.savePaypalError")
      );
      setResultType("error");
      setResultVisible(true);
    } finally {
      setAddingPaymentMethod(false);
    }
  };

  const handleReservation = async () => {
    if (!parkingId) {
      setErrorMessage(t("reservation.parkingMissing"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    if (!selectedVehicle) {
      setErrorMessage(t("reservation.addPlateFirst"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    if (!selectedPaymentMethod) {
      setErrorMessage(t("reservation.addPaymentFirst"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    let reservationId: number | null = null;

    try {
      setSubmitting(true);

      const reservation = await createSoftHold({
        parkingId,
        spots: 1,
        hours: 1,
        vehiclePlate: selectedVehicle.plate,
      });
      reservationId = reservation.id;

      const returnUrl = Linking.createURL("paypal-return");
      const cancelUrl = Linking.createURL("paypal-cancel");
      const currency: PaymentCurrency = "EUR";

      const order = await createPayPalOrder({
        reservationId: reservation.id,
        returnUrl,
        cancelUrl,
        currency,
        paymentMethodId: selectedPaymentMethod.id,
      });

      if (!order.approveUrl) {
        throw new Error(t("reservation.paypalLinkMissing"));
      }

      const authResult = await WebBrowser.openAuthSessionAsync(order.approveUrl, returnUrl);
      if (authResult.type !== "success" || !authResult.url) {
        await cancelReservation(reservation.id);
        throw new Error(t("reservation.paypalCancelled"));
      }

      const redirectData = Linking.parse(authResult.url);
      const queryToken =
        typeof redirectData.queryParams?.token === "string"
          ? redirectData.queryParams.token
          : order.orderId;

      await capturePayPalOrder({
        reservationId: reservation.id,
        orderId: queryToken,
        currency,
        paymentMethodId: selectedPaymentMethod.id,
      });

      invalidateReservationCache();
      invalidateNotificationsCache();
      invalidateParkingCache(parkingId);
      invalidateProfileCache();

      onClose();
      setResultType("success");
      setResultVisible(true);

      setTimeout(() => {
        setResultVisible(false);
        router.push("/(tabs)/home");
      }, 1500);

      onReservationSuccess?.();
    } catch (err: any) {
      if (reservationId) {
        try {
          await cancelReservation(reservationId);
        } catch (cancelError) {
          console.warn("Failed to release cancelled reservation hold", cancelError);
        }
      }

      console.warn("Reservation failed", err);
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        t("reservation.finalizeError");
      setErrorMessage(msg);
      setResultType("error");
      setResultVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestReservation = async () => {
    if (!parkingId) {
      setErrorMessage(t("reservation.parkingMissing"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    if (!selectedVehicle) {
      setErrorMessage(t("reservation.addPlateFirst"));
      setResultType("error");
      setResultVisible(true);
      return;
    }

    let reservationId: number | null = null;

    try {
      setSubmitting(true);
      const reservation = await createSoftHold({
        parkingId,
        spots: 1,
        hours: 1,
        vehiclePlate: selectedVehicle.plate,
      });
      reservationId = reservation.id;

      await confirmReservationForTesting(reservation.id);
      invalidateReservationCache();
      invalidateNotificationsCache();
      invalidateParkingCache(parkingId);
      onClose();
      setResultType("success");
      setResultVisible(true);

      setTimeout(() => {
        setResultVisible(false);
        router.push("/(tabs)/home");
      }, 1500);

      onReservationSuccess?.();
    } catch (err: any) {
      if (reservationId) {
        try {
          await cancelReservation(reservationId);
        } catch (cancelError) {
          console.warn("Failed to release cancelled reservation hold", cancelError);
        }
      }

      const msg =
        err?.response?.data?.message ??
        err?.message ??
        t("reservation.testFinalizeError");
      setErrorMessage(msg);
      setResultType("error");
      setResultVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const vehicles = profile?.vehicles ?? [];
  const paymentMethods = profile?.paymentMethods ?? [];

  return (
    <Modal visible={visible || resultVisible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                resultVisible && styles.resultModalContainer,
              ]}
            >
              {visible && !resultVisible ? (
                <Pressable style={styles.floatingCloseButton} onPress={onClose}>
                  <Ionicons name="close" size={18} color="#000000" />
                </Pressable>
              ) : null}

              {visible && !resultVisible && (
                <>
                  {loadingProfile ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator color="#00358B" />
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.title}>{t("reservation.title")}</Text>

                      <Text style={styles.sectionTitle}>{t("reservation.choosePlate")}</Text>
                      <View style={styles.cardGroup}>
                        {vehicles.map((vehicle) => {
                          const selected = selectedVehicle?.id === vehicle.id;
                          return (
                            <Pressable
                              key={vehicle.id}
                              style={[styles.selectionCard, selected && styles.selectionCardActive]}
                              onPress={() => setSelectedVehicle(vehicle)}
                            >
                              <View>
                                <Text style={styles.cardText}>{vehicle.plate}</Text>
                              </View>
                              {selected ? (
                                <Ionicons name="checkmark-circle" size={22} color="#0B8BFF" />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>

                      {vehicles.length === 0 ? (
                        <Text style={styles.helperText}>
                          {t("reservation.addVehicleHint")}
                        </Text>
                      ) : null}

                      <View style={styles.inlineForm}>
                        <TextInput
                          ref={plateInputRef}
                          style={styles.inlineInput}
                          placeholder="AB 123 JK"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                          value={newPlate}
                          onChangeText={setNewPlate}
                          returnKeyType="done"
                          blurOnSubmit
                          onSubmitEditing={handlePlateInputDone}
                          onBlur={handlePlateInputDone}
                        />
                      </View>

                      <Text style={styles.sectionTitle}>{t("reservation.choosePayment")}</Text>
                      <View style={styles.cardGroup}>
                        {paymentMethods.map((method) => {
                          const selected = selectedPaymentMethod?.id === method.id;
                          const label = method.displayLabel?.trim() || method.accountEmail;
                          return (
                            <Pressable
                              key={method.id}
                              style={[styles.selectionCard, selected && styles.selectionCardActive]}
                              onPress={() => setSelectedPaymentMethod(method)}
                              >
                                <View style={styles.paymentRow}>
                                  <Ionicons name="logo-paypal" size={22} color="#003087" />
                                  <View>
                                    <Text style={styles.cardText}>{formatEmailForWrap(label)}</Text>
                                    <Text style={styles.cardMeta}>{formatEmailForWrap(method.accountEmail)}</Text>
                                  </View>
                                </View>
                                {selected ? (
                                <Ionicons name="checkmark-circle" size={22} color="#0B8BFF" />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>

                      {paymentMethods.length === 0 ? (
                        <Text style={styles.helperText}>
                          {t("reservation.addPaypalHint")}
                        </Text>
                      ) : null}

                      <View style={styles.inlineForm}>
                        <TextInput
                          style={styles.inlineInput}
                          placeholder="paypal@email.com"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          value={newPayPalEmail}
                          onChangeText={setNewPayPalEmail}
                        />
                        <Pressable onPress={handleAddPaymentMethod} disabled={addingPaymentMethod}>
                          <LinearGradient
                            colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                            locations={[0, 0.378, 0.6298, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.paypalAddButton}
                          >
                            <Text style={styles.paypalAddButtonText}>
                              {addingPaymentMethod ? t("reservation.saving") : t("reservation.addPaypal")}
                            </Text>
                          </LinearGradient>
                        </Pressable>
                      </View>

                      <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>{t("reservation.feeLabel")}</Text>
                        <Text style={styles.summaryPrice}>{totalCost} ALL</Text>
                        <Text style={styles.summaryFee}>{t("reservation.fixedFeeText")}</Text>
                        <Text style={styles.summaryHint}>
                          {t("reservation.estimatedPaypal", { amount: estimatedEur })}
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.saveButton, submitting && { opacity: 0.6 }]}
                        onPress={handleReservation}
                        disabled={submitting || vehicles.length === 0 || paymentMethods.length === 0}
                      >
                        <LinearGradient
                          colors={["#3080FF", "#00358B"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.saveGradient}
                        >
                          {submitting ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.saveText}>{t("reservation.continuePaypal")}</Text>
                          )}
                        </LinearGradient>
                      </Pressable>

                      <Pressable
                        style={[styles.testReserveButton, submitting && { opacity: 0.6 }]}
                        onPress={handleTestReservation}
                        disabled={submitting || vehicles.length === 0}
                      >
                        <Ionicons name="flask-outline" size={16} color="#0B8BFF" />
                        <Text style={styles.testReserveText}>{t("reservation.reserveForTesting")}</Text>
                      </Pressable>
                    </ScrollView>
                  )}
                </>
              )}

              {resultVisible && (
                <View style={styles.resultBox}>
                  <Pressable style={styles.resultClose} onPress={closeResult}>
                    <Ionicons name="close" size={18} color="#000000" />
                  </Pressable>

                  <View
                    style={[
                      styles.resultCircle,
                      resultType === "success" ? styles.successCircle : styles.errorCircle,
                    ]}
                  >
                    <Ionicons
                      name={resultType === "success" ? "checkmark" : "close"}
                      size={58}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.resultText}>
                    {resultType === "success"
                      ? t("reservation.success")
                      : errorMessage || t("reservation.error")}
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalContainer: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    paddingTop: 24,
  },
  resultModalContainer: {
    maxHeight: 320,
    justifyContent: "center",
  },
  closeButton: {
    alignSelf: "flex-end",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 22,
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 29,
    textAlign: "left",
  },
  floatingCloseButton: {
    position: "absolute",
    top: 18,
    right: 20,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginTop: 18,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  cardGroup: {
    marginTop: 12,
    gap: 10,
  },
  selectionCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  selectionCardActive: {
    borderColor: "#0B8BFF",
    backgroundColor: "#F4F9FF",
  },
  cardText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  cardMeta: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
  },
  helperText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  inlineForm: {
    marginTop: 12,
    gap: 10,
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: "#D7E0EC",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 14,
  },
  paypalAddButton: {
    alignSelf: "flex-start",
    minWidth: 138,
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  paypalAddButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryCard: {
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    padding: 16,
  },
  summaryLabel: {
    color: "#B8C7DA",
    fontSize: 12,
  },
  summaryPrice: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },
  summaryHint: {
    marginTop: 8,
    color: "#93A4B8",
    fontSize: 12,
    lineHeight: 18,
  },
  summaryFee: {
    marginTop: 8,
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 22,
    overflow: "hidden",
  },
  saveGradient: {
    minHeight: 52,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  testReserveButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  testReserveText: {
    color: "#0B8BFF",
    fontSize: 14,
    fontWeight: "700",
  },
  resultBox: {
    alignItems: "center",
  },
  resultClose: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    backgroundColor: "#16A34A",
  },
  errorCircle: {
    backgroundColor: "#DC2626",
  },
  resultText: {
    marginTop: 22,
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 25,
  },
});
