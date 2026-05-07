import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import colors from "@/constants/colors";
import fonts from "@/constants/fonts";

export default function VerifyCodeScreen() {
  const correctCode = "12345";

  const [code, setCode] = useState(["", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(59);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

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

    const enteredCode = newCode.join("");

    if (enteredCode.length === 5 && enteredCode === correctCode) {
      Keyboard.dismiss();
      router.push("/(auth)/new-password");
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

  const handleSend = () => {
    const enteredCode = code.join("");

    if (enteredCode === correctCode) {
      Keyboard.dismiss();
      router.push("/(auth)/new-password");
    }
  };

  const handleResend = () => {
    setSecondsLeft(59);
    setCode(["", "", "", "", ""]);
    inputsRef.current[0]?.focus();
  };

  const formattedTime = `0:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <AuthHeader title="Ndrysho Fjalëkalimin" />

          <View style={styles.formContainer}>
            <Text style={styles.subtitle}>
              Shkruani kodin 5-shifror nga emaili juaj.
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

          <View style={styles.buttonContainer}>
            <AuthButton title="Dërgo" onPress={handleSend} />

            <AuthFooter
              text=""
              linkText={
                secondsLeft > 0
                  ? `Ridërgo kodin në ${formattedTime}`
                  : "Ridërgo"
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
    marginTop: 95,
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
    width: 52,
    height: 58,
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
});