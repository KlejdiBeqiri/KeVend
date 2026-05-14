import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import BackButton from "@/components/common/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import {
  clearPasswordResetSession,
  getErrorMessage,
  getPasswordResetSession,
  resetPassword,
} from "@/services/authService";

const getSingleParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default function NewPasswordScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const paramEmail = getSingleParam(params.email);
  const paramCode = getSingleParam(params.code);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState(paramEmail);
  const [sessionCode, setSessionCode] = useState(paramCode);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      if (paramEmail && paramCode) {
        return;
      }

      const session = await getPasswordResetSession();
      if (!isMounted || !session) {
        return;
      }

      setSessionEmail(session.email);
      setSessionCode(session.code);
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [paramCode, paramEmail]);

  const handleSave = async () => {
    setError("");

    if (!sessionEmail || !sessionCode) {
      setError(t("auth.missingResetSession"));
      return;
    }

    if (!password || !confirmPassword) {
      setError(t("auth.fillBothFields"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }

    try {
      setLoading(true);
      await resetPassword(sessionEmail, sessionCode, password);
      Alert.alert(t("common.success"), t("auth.passwordChanged"));
      router.replace("/(auth)/login");
    } catch (err) {
      setError(getErrorMessage(err, t("auth.changePasswordFailed")));
      if (getErrorMessage(err, "").toLowerCase().includes("kod")) {
        await clearPasswordResetSession();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <BackButton />
          <AuthHeader title={t("auth.resetPassword")} />

          <View style={styles.formContainer}>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.newPassword")}
              secureTextEntry={securePassword}
              onToggleSecure={() => setSecurePassword(!securePassword)}
            />

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("auth.confirmPassword")}
                secureTextEntry={secureConfirmPassword}
                onToggleSecure={() =>
                  setSecureConfirmPassword(!secureConfirmPassword)
                }
              />
            </View>
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
    marginTop: 95,
  },
  inputSpacing: {
    marginTop: 12,
  },
  buttonContainer: {
    marginTop: 45,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
  },
});
