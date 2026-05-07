import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import colors from "@/constants/colors";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Gabim", "Ju lutem plotësoni të gjitha fushat.");
      return;
    }

    if (newPassword !== confirmPassword) {
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
          <AuthHeader title="Ndrysho Fjalëkalimin" subtitle="" />

          <View style={styles.formContainer}>
            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Shkruaj fjalëkalimin aktual."
              secureTextEntry={secureCurrent}
              onToggleSecure={() => setSecureCurrent(!secureCurrent)}
            />

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Shkruaj fjalëkalimin e ri."
                secureTextEntry={secureNew}
                onToggleSecure={() => setSecureNew(!secureNew)}
              />
            </View>

            <View style={styles.inputSpacing}>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Konfirmo fjalëkalimin"
                secureTextEntry={secureConfirm}
                onToggleSecure={() => setSecureConfirm(!secureConfirm)}
              />
            </View>
          </View>

          <View style={styles.optionsRow}>
            <View />
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotText}>Ke harruar fjalëkalimin?</Text>
            </TouchableOpacity>
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
  buttonContainer: {
    marginTop: 56,
    alignItems: "center",
  },
});