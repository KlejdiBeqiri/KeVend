import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import CustomInput from "@/components/auth/CustomInput";
import PasswordInput from "@/components/auth/PasswordInput";
import { useI18n } from "@/i18n/I18nProvider";
import { getErrorMessage, register } from "@/services/authService";

export default function RegisterScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password || !confirmPassword) {
      setError(t("auth.fillAllFields"));
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
      await register({
        email,
        firstName,
        lastName,
        phone,
        password,
      });
      router.replace("/(tabs)/map");
    } catch (err) {
      setError(getErrorMessage(err, t("auth.registerFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.headerContainer}>
        <AuthHeader title={t("auth.register")} compact />
      </View>
      <View style={styles.formContainer}>
        <CustomInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          icon="email"
        />
        <CustomInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t("auth.firstNamePlaceholder")}
          icon="person-outline"
        />
        <CustomInput
          value={lastName}
          onChangeText={setLastName}
          placeholder={t("auth.lastNamePlaceholder")}
          icon="person-outline"
        />
        <CustomInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t("auth.phonePlaceholder")}
          icon="phone"
        />
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.password")}
          secureTextEntry={securePassword}
          onToggleSecure={() => setSecurePassword(!securePassword)}
        />
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

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <AuthButton title={t("auth.register")} onPress={handleRegister} />
        )}
      </View>
      <AuthFooter
        text={t("auth.haveAccount")}
        linkText={t("auth.loginLink")}
        onPress={() => router.replace("/(auth)/login")}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: -10,
  },
  formContainer: {
    marginTop: 8,
    gap: 6,
  },
  buttonContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
  },
});
