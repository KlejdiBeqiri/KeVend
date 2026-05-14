import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import CustomInput from "@/components/auth/CustomInput";
import BackButton from "@/components/common/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getErrorMessage,
  requestPasswordReset,
} from "@/services/authService";

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setError("");

    if (!email.trim()) {
      setError(t("auth.enterEmail"));
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      await requestPasswordReset(normalizedEmail);
      router.push({
        pathname: "/(auth)/verify-code",
        params: { email: normalizedEmail },
      });
    } catch (err) {
      setError(getErrorMessage(err, t("auth.codeSendFailed")));
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
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              icon="email"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <AuthButton title={t("auth.send")} onPress={handleSend} />
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
