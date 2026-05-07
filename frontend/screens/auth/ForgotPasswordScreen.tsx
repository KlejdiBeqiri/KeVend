import React, { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";

import AuthButton from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import CustomInput from "@/components/auth/CustomInput";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");

  const handleSend = () => {
    console.log("Reset password email sent");
    router.push("/(auth)/verify-code");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <AuthHeader title="Ndrysho Fjalëkalimin" />

          <View style={styles.formContainer}>
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              icon="email"
            />
          </View>

          <View style={styles.buttonContainer}>
            <AuthButton title="Dërgo" onPress={handleSend} />
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
});