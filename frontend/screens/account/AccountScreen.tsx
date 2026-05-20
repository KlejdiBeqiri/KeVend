import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import api from "@/api";
import ScreenHeader from "@/components/common/ScreenHeader";
import styles from "@/constants/styles/accountStyle";
import { AppLocale } from "@/i18n/translations";
import { useI18n } from "@/i18n/I18nProvider";
import { clearTokens, getErrorMessage } from "@/services/authService";
import {
  addPaymentMethod,
  addVehicle,
  deletePaymentMethod,
  deleteVehicle,
  fetchMyProfile,
  updatePreferredLocale,
  updateMyProfile,
  UserPaymentMethod,
  UserVehicle,
} from "@/services/profileService";

const formatEmailForWrap = (value: string) => value.replace("@", "@\u200b");

export default function AccountScreen() {
  const { locale, setLocale, t } = useI18n();
  const didHydrateLocaleRef = useRef(false);
  const localeRef = useRef(locale);
  const [plateModalVisible, setPlateModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [plates, setPlates] = useState<UserVehicle[]>([]);
  const [newPlate, setNewPlate] = useState("");
  const [isPrimaryPlate, setIsPrimaryPlate] = useState(false);

  const [payments, setPayments] = useState<UserPaymentMethod[]>([]);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [isPrimaryPayment, setIsPrimaryPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaveState, setProfileSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savingProfile, setSavingProfile] = useState(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchMyProfile();
        setName((data as any).firstName ?? data.name ?? "");
        setSurname((data as any).lastName ?? data.surname ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setPlates(data.vehicles ?? []);
        setPayments(data.paymentMethods ?? []);
      setProfileLoaded(true);
        if (
          !didHydrateLocaleRef.current &&
          (data.preferredLocale === "sq" || data.preferredLocale === "en") &&
          data.preferredLocale !== localeRef.current
        ) {
          didHydrateLocaleRef.current = true;
          await setLocale(data.preferredLocale);
        } else {
          didHydrateLocaleRef.current = true;
        }
        
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [setLocale]);

  useEffect(() => {
    if (!profileLoaded || !profileDirty) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedSurname = surname.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedName || !normalizedSurname || !normalizedPhone) {
      setProfileSaveState("error");
      setProfileError(t("account.fillProfileFields"));
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSavingProfile(true);
        setProfileSaveState("saving");
        setProfileError("");
        await updateMyProfile({
          name: normalizedName,
          surname: normalizedSurname,
          phone: normalizedPhone,
        });
        setProfileDirty(false);
        setProfileSaveState("saved");
      } catch (err) {
        setProfileSaveState("error");
        setProfileError(getErrorMessage(err, t("account.profileSaveFailed")));
      } finally {
        setSavingProfile(false);
      }
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [name, phone, profileDirty, profileLoaded, surname, t]);

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await clearTokens();
    router.replace("/(guest)/map-guest");
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/users/me");
      await clearTokens();
      setDeleteModalVisible(false);
      router.replace("/(guest)/map-guest");
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const handleAddPlate = async () => {
    if (!newPlate.trim()) return;

    try {
      const created = await addVehicle({
        plate: newPlate.trim().toUpperCase(),
        primaryVehicle: isPrimaryPlate,
      });
      setPlates((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setNewPlate("");
      setIsPrimaryPlate(false);
      setPlateModalVisible(false);
    } catch (err) {
      console.error("Failed to add vehicle:", err);
    }
  };

  const handleDeletePlate = async (vehicleId: number) => {
    try {
      await deleteVehicle(vehicleId);
      setPlates((current) => current.filter((item) => item.id !== vehicleId));
    } catch (err) {
      console.error("Failed to delete vehicle:", err);
    }
  };

  const handleAddPayment = async () => {
    const normalizedEmail = paymentEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setPaymentError(t("account.enterPaypalEmail"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setPaymentError(t("account.invalidPaypalEmail"));
      return;
    }

    try {
      const created = await addPaymentMethod({
        provider: "PAYPAL",
        accountEmail: normalizedEmail,
        displayLabel: normalizedEmail,
        primaryMethod: isPrimaryPayment,
      });
      setPayments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setPaymentEmail("");
      setIsPrimaryPayment(false);
      setPaymentError("");
      setPaymentModalVisible(false);
    } catch (err) {
      setPaymentError(getErrorMessage(err, t("account.paymentSaveFailed")));
      console.error("Failed to add payment method:", err);
    }
  };

  const handleLocaleChange = async (nextLocale: AppLocale) => {
    try {
      await setLocale(nextLocale);
      await updatePreferredLocale(nextLocale);
    } catch (err) {
      console.error("Failed to update locale:", err);
    }
  };

  const handleDeletePayment = async (methodId: number) => {
    try {
      await deletePaymentMethod(methodId);
      setPayments((current) => current.filter((item) => item.id !== methodId));
    } catch (err) {
      console.error("Failed to delete payment method:", err);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3080FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader />

          <View style={styles.content}>
            <View style={styles.avatarWrapper}>
              <Ionicons name="person-outline" size={58} color="#000000" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("account.profile")}</Text>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("account.firstName")}</Text>
                  <View style={styles.inputPressable}>
                    <TextInput
                      style={styles.inputText}
                      placeholder={t("account.firstName")}
                      placeholderTextColor="rgba(225, 225, 225, 0.83)"
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        setProfileDirty(true);
                        setProfileSaveState("idle");
                        if (profileError) setProfileError("");
                      }}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("account.lastName")}</Text>
                  <View style={styles.inputPressable}>
                    <TextInput
                      style={styles.inputText}
                      placeholder={t("account.lastName")}
                      placeholderTextColor="rgba(225, 225, 225, 0.83)"
                      value={surname}
                      onChangeText={(value) => {
                        setSurname(value);
                        setProfileDirty(true);
                        setProfileSaveState("idle");
                        if (profileError) setProfileError("");
                      }}
                    />
                  </View>
                </View>


              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("common.email")}</Text>
                  <View style={styles.inputPressable} pointerEvents="none">
                    <TextInput
                      style={styles.inputText}
                      placeholder={t("common.email")}
                      placeholderTextColor="rgba(225, 225, 225, 0.83)"
                      value={email}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("common.phone")}</Text>
                  <View style={styles.inputPressable}>
                    <TextInput
                        style={styles.inputText}
                        placeholder={t("common.phone")}
                        placeholderTextColor="rgba(225, 225, 225, 0.83)"
                        value={phone}
                        onChangeText={(value) => {
                          setPhone(value);
                          setProfileDirty(true);
                          setProfileSaveState("idle");
                          if (profileError) setProfileError("");
                        }}
                        keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              {profileSaveState === "saving" ? (
                <Text style={styles.profileSavingText}>{t("account.savingChanges")}</Text>
              ) : null}
              {profileError ? <Text style={styles.profileErrorText}>{profileError}</Text> : null}

              <Pressable
                style={[styles.passwordPressable, savingProfile && { opacity: 0.7 }]}
                onPress={() => router.push("/(screens)/change-password")}
                disabled={savingProfile}
              >
                <LinearGradient
                  colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                  locations={[0, 0.378, 0.6298, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.passwordButton}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.passwordButtonText}>{t("account.changePassword")}</Text>
                </LinearGradient>
              </Pressable>

              <Text style={styles.sectionTitle}>{t("account.plates")}</Text>
              <View style={styles.cardGroup}>
                {plates.map((plate) => (
                  <View key={plate.id} style={styles.darkCard}>
                    <View style={styles.cardContentWrap}>
                      <Text style={styles.cardTextPrimary}>{plate.plate}</Text>
                      {plate.primaryVehicle ? (
                        <View style={styles.primaryPill}>
                          <Text style={styles.primaryPillText}>{t("account.primary")}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable onPress={() => handleDeletePlate(plate.id)}>
                      <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}

                <Pressable style={styles.lightCard} onPress={() => setPlateModalVisible(true)}>
                  <Ionicons name="add-circle-outline" size={13} color="#000000" />
                  <Text style={styles.lightCardText}>{t("account.addPlate")}</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>{t("account.payments")}</Text>
              <View style={styles.cardGroup}>
                {payments.map((payment) => (
                  <View key={payment.id} style={styles.darkCard}>
                    <View style={styles.cardContentWrap}>
                      <Image
                        source={require("../../assets/paypal.png")}
                        style={styles.paymentLogo}
                      />
                        <View style={styles.paymentInfoWrap}>
                          <Text style={styles.paymentText}>
                          {formatEmailForWrap(payment.displayLabel ?? payment.accountEmail)}
                          </Text>
                          <Text style={styles.paymentMetaText}>PayPal</Text>
                        </View>
                      {payment.primaryMethod ? (
                        <View style={styles.primaryPill}>
                          <Text style={styles.primaryPillText}>{t("account.primary")}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable onPress={() => handleDeletePayment(payment.id)}>
                      <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}

                <Pressable style={styles.lightCard} onPress={() => setPaymentModalVisible(true)}>
                  <Ionicons name="add-circle-outline" size={13} color="#000000" />
                  <Text style={styles.lightCardText}>{t("account.addPaymentMethod")}</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>{t("account.language")}</Text>
              <View style={styles.languageRow}>
                <Pressable
                  style={[styles.languagePill, locale === "sq" && styles.languagePillActive]}
                  onPress={() => handleLocaleChange("sq")}
                >
                  <Text style={[styles.languagePillText, locale === "sq" && styles.languagePillTextActive]}>
                    {t("account.languageSq")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.languagePill, locale === "en" && styles.languagePillActive]}
                  onPress={() => handleLocaleChange("en")}
                >
                  <Text style={[styles.languagePillText, locale === "en" && styles.languagePillTextActive]}>
                    {t("account.languageEn")}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.invoiceRow}
                onPress={() => router.push("/(screens)/invoices")}
              >
                <Text style={styles.invoiceText}>{t("account.invoices")}</Text>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </Pressable>

              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={styles.logoutButton}
                  onPress={() => setLogoutModalVisible(true)}
                >
                  <Ionicons name="log-out-outline" size={22} color="#E50000" />
                  <Text style={styles.logoutText}>{t("account.logout")}</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => setDeleteModalVisible(true)}
                >
                  <Text style={styles.deleteText}>{t("account.deleteAccount")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={plateModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.overlay}>
            <View style={styles.plateModal}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderSpacer} />
                <Text style={styles.modalTitle}>{t("account.newPlateTitle")}</Text>
                <Pressable style={styles.closeButton} onPress={() => setPlateModalVisible(false)}>
                  <Ionicons name="close" size={18} color="#000000" />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>
                {t("account.newPlateSubtitle")}
              </Text>
              <Text style={styles.modalLabel}>{t("account.plate")}</Text>
              <TextInput
                style={styles.modalInput}
                value={newPlate}
                onChangeText={setNewPlate}
                autoCapitalize="characters"
                placeholder="AB 123 JK"
                placeholderTextColor="#94A3B8"
              />
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIsPrimaryPlate(!isPrimaryPlate)}
              >
                <View style={styles.modalCheckbox}>
                  {isPrimaryPlate ? (
                    <Ionicons name="checkmark" size={10} color="#000000" />
                  ) : null}
                </View>
                <Text style={styles.checkboxText}>{t("account.primaryPlate")}</Text>
              </Pressable>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.modalGhostButton}
                  onPress={() => setPlateModalVisible(false)}
                >
                  <Text style={styles.modalGhostText}>{t("common.close")}</Text>
                </Pressable>
                <Pressable onPress={handleAddPlate}>
                  <LinearGradient
                    colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                    locations={[0, 0.378, 0.6298, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveButton}
                  >
                    <Text style={styles.modalSaveText}>{t("common.save")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.overlay}>
            <View style={styles.paymentModal}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderSpacer} />
                <Text style={styles.modalTitle}>{t("account.newPaymentTitle")}</Text>
                <Pressable style={styles.closeButton} onPress={() => setPaymentModalVisible(false)}>
                  <Ionicons name="close" size={18} color="#000000" />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>
                {t("account.newPaymentSubtitle")}
              </Text>
              <Text style={styles.modalLabel}>{t("account.paypalEmail")}</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="paypal@email.com"
                placeholderTextColor="#94A3B8"
                value={paymentEmail}
                onChangeText={(value) => {
                  setPaymentEmail(value);
                  if (paymentError) setPaymentError("");
                }}
              />
              {paymentError ? <Text style={styles.modalErrorText}>{paymentError}</Text> : null}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setIsPrimaryPayment(!isPrimaryPayment)}
              >
                <View style={styles.modalCheckbox}>
                  {isPrimaryPayment ? (
                    <Ionicons name="checkmark" size={10} color="#000000" />
                  ) : null}
                </View>
                <Text style={styles.checkboxText}>{t("account.primaryPayment")}</Text>
              </Pressable>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.modalGhostButton}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <Text style={styles.modalGhostText}>{t("common.close")}</Text>
                </Pressable>
                <Pressable onPress={handleAddPayment}>
                  <LinearGradient
                    colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
                    locations={[0, 0.378, 0.6298, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveButton}
                  >
                    <Text style={styles.modalSaveText}>{t("common.save")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutTitle}>{t("account.logoutQuestion")}</Text>
            <View style={styles.logoutButtonsRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={styles.confirmLogoutButton} onPress={handleLogout}>
                <Text style={styles.confirmLogoutText}>{t("account.logout")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutTitle}>{t("account.deleteQuestion")}</Text>
            <View style={styles.logoutButtonsRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={styles.confirmLogoutButton} onPress={handleDeleteAccount}>
                <Text style={styles.confirmLogoutText}>{t("common.delete")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
