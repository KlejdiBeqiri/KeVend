import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import BackButton from "@/components/common/BackButton";
import colors from "@/constants/colors";
import { useI18n } from "@/i18n/I18nProvider";
import {
  changePassword,
  getErrorMessage,
  requestPasswordResetForCurrentUser,
} from "@/services/authService";

export default function ChangePasswordScreen() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSave = async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.newPasswordMin"));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t("auth.newPasswordDifferent"));
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      Alert.alert(t("common.success"), t("auth.loginAgain"));
      router.replace("/(auth)/login");
    } catch (err) {
      setError(getErrorMessage(err, t("auth.changePasswordFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");

    try {
      setForgotLoading(true);
      const email = await requestPasswordResetForCurrentUser();
      router.push({
        pathname: "/(auth)/verify-code",
        params: { email, source: "authenticated" },
      });
    } catch (err) {
      setError(getErrorMessage(err, t("auth.codeSendFailed")));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <BackButton />
          <AuthHeader title={t("account.changePassword")} subtitle="" />

          <View style={styles.formContainer}>
            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
                placeholder={t("auth.currentPassword")}
              secureTextEntry={secureCurrent}
              onToggleSecure={() => setSecureCurrent(!secureCurrent)}
            />

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("auth.enterNewPassword")}
                secureTextEntry={secureNew}
                onToggleSecure={() => setSecureNew(!secureNew)}
              />
            </View>

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("auth.confirmPassword")}
                secureTextEntry={secureConfirm}
                onToggleSecure={() => setSecureConfirm(!secureConfirm)}
              />
            </View>
          </View>

          <View style={styles.optionsRow}>
            <View />
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              <Text style={[styles.forgotText, forgotLoading && styles.forgotTextDisabled]}>
                {t("auth.forgotPassword")}
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <AuthButton title={t("common.save")} onPress={handleSave} />
            )}
          </View>
        </AuthLayout>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginTop: 26,
  },
  inputSpacing: {
    marginTop: 12,
  },
  optionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotText: {
    color: colors.white,
    fontSize: 14,
    fontStyle: "italic",
    textDecorationLine: "underline",
    textDecorationColor: colors.white,
    transform: [{ skewX: "-12deg" }],
  },
  forgotTextDisabled: {
    opacity: 0.55,
  },
  buttonContainer: {
    marginTop: 56,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
  },
});
