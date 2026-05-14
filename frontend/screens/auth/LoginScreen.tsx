import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import CustomInput from "@/components/auth/CustomInput";
import PasswordInput from "@/components/auth/PasswordInput";
import colors from "@/constants/colors";
import { useI18n } from "@/i18n/I18nProvider";
import { getErrorMessage, login } from "@/services/authService";

export default function LoginScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("auth.fillAllFields"));
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      router.replace("/(tabs)/map");
    } catch (err) {
      setError(getErrorMessage(err, t("auth.loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <AuthHeader
            title={t("auth.welcome")}
            subtitle={t("auth.welcomeSubtitle")}
          />

          <View style={styles.formContainer}>
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              icon="email"
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.password")}
              secureTextEntry={secureText}
              onToggleSecure={() => setSecureText(!secureText)}
            />
          </View>

          <View style={styles.optionsRow}>
            <View />
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <AuthButton title={t("auth.login")} onPress={handleLogin} />
            )}
          </View>

          <AuthFooter
            text={t("auth.noAccount")}
            linkText={t("auth.registerLink")}
            onPress={() => router.replace("/(auth)/register")}
          />
        </AuthLayout>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginTop: 26,
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
  buttonContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
  },
});
