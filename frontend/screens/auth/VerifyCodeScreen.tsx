import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import BackButton from "@/components/common/BackButton";
import colors from "@/constants/colors";
import fonts from "@/constants/fonts";
import { useI18n } from "@/i18n/I18nProvider";
import {
  clearPasswordResetSession,
  getErrorMessage,
  requestPasswordReset,
  requestPasswordResetForCurrentUser,
  savePasswordResetSession,
  verifyPasswordResetCode,
} from "@/services/authService";

const getSingleParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default function VerifyCodeScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ email?: string; source?: string }>();
  const email = getSingleParam(params.email);
  const source = getSingleParam(params.source);
  const fromAuthenticatedReset = source === "authenticated";

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(59);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleChange = (text: string, index: number) => {
    const value = text.replace(/[^0-9]/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < code.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSend = async () => {
    setError("");

    if (!email) {
      setError(t("auth.emailMissingReset"));
      return;
    }

    const enteredCode = code.join("");

    if (enteredCode.length !== 5) {
      setError(t("auth.enterCode"));
      return;
    }

    try {
      setLoading(true);
      await verifyPasswordResetCode(email, enteredCode);
      await savePasswordResetSession({ email, code: enteredCode });
      Keyboard.dismiss();
      router.push({
        pathname: "/(auth)/new-password",
        params: { email, code: enteredCode },
      });
    } catch (err) {
      setError(getErrorMessage(err, t("auth.codeVerificationFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !email) {
      return;
    }

    setError("");

    try {
      setResending(true);
      if (fromAuthenticatedReset) {
        await requestPasswordResetForCurrentUser();
      } else {
        await requestPasswordReset(email);
      }
      await clearPasswordResetSession();
      setSecondsLeft(59);
      setCode(["", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(getErrorMessage(err, t("auth.resendFailed")));
    } finally {
      setResending(false);
    }
  };

  const formattedTime = `0:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <BackButton />
          <AuthHeader title={t("auth.verifyCode")} />

          <View style={styles.formContainer}>
            <Text style={styles.subtitle}>
              {t("auth.codeSubtitle")}
            </Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputsRef.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.codeInput}
                  textAlign="center"
                />
              ))}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <AuthButton title="Vazhdo" onPress={handleSend} />
            )}

            <AuthFooter
              text=""
              linkText={
                resending
                  ? t("auth.resendLoading")
                  : secondsLeft > 0
                    ? t("auth.resendCodeIn", { time: formattedTime })
                    : t("auth.resend")
              }
              onPress={handleResend}
            />
          </View>
        </AuthLayout>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginTop: 65,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 17,
    color: colors.white,
    textAlign: "center",
    fontFamily: fonts.interRegular,
    marginBottom: 35,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  codeInput: {
    width: 63,
    height: 73,
    backgroundColor: colors.white,
    borderRadius: 12,
    fontSize: 22,
    color: colors.background,
    fontFamily: fonts.interSemiBold,
  },
  buttonContainer: {
    marginTop: 45,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
  },
});
