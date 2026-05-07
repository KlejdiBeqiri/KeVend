import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AuthButton from "@/components/auth/AuthButton";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";

export default function NewPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);

  const handleSave = () => {
    if (!password || !confirmPassword) {
      Alert.alert("Gabim", "Ju lutem plotësoni të dy fushat.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Gabim", "Fjalëkalimet nuk përputhen.");
      return;
    }

    console.log("Password changed successfully");
    Alert.alert("Sukses", "Fjalëkalimi u ndryshua me sukses.");
    router.replace("/(auth)/login");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <AuthHeader title="Ndrysho Fjalëkalimin" />

          <View style={styles.formContainer}>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Fjalëkalimi"
              secureTextEntry={securePassword}
              onToggleSecure={() => setSecurePassword(!securePassword)}
            />

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Konfirmo fjalëkalimin"
                secureTextEntry={secureConfirmPassword}
                onToggleSecure={() =>
                  setSecureConfirmPassword(!secureConfirmPassword)
                }
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <AuthButton title="Ruaj" onPress={handleSave} />
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
});