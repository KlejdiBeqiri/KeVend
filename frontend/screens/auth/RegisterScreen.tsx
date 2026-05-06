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
import api from "../../api";
import AuthButton from "../../components/auth/AuthButton";
import AuthFooter from "../../components/auth/AuthFooter";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthLayout from "../../components/auth/AuthLayout";
import CustomInput from "../../components/auth/CustomInput";
import PasswordInput from "../../components/auth/PasswordInput";

export default function RegisterScreen() {
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

    if (!email || !firstName || !lastName || !password || !confirmPassword) {
      setError("Ju lutem plotësoni të gjitha fushat.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Fjalëkalimet nuk përputhen.");
      return;
    }

    if (password.length < 8) {
      setError("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/register", {
        name: firstName,
        surname: lastName,
        email: email,
        password: password,
        phone: phone,
      });

      console.log("Registered successfully:", response.data);
      router.push("/login" as any);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Diçka shkoi keq. Provoni përsëri.");
      }
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push("/login" as any);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <AuthLayout>
          <View style={styles.headerContainer}>
            <AuthHeader title="Regjistrohu" compact />
          </View>
          <View style={styles.formContainer}>
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              icon="email"
            />
            <CustomInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Emri i përdoruesit"
              icon="person-outline"
            />
            <CustomInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Mbiemri i përdoruesit"
              icon="person-outline"
            />
            <CustomInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Numri i telefonit"
              icon="phone"
            />
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Fjalëkalimi"
              secureTextEntry={securePassword}
              onToggleSecure={() => setSecurePassword(!securePassword)}
            />
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

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <AuthButton title="Regjistrohu" onPress={handleRegister} />
            )}
          </View>
          <AuthFooter
            text="Keni një llogari? "
            linkText="Kyçu."
            onPress={goToLogin}
          />
        </AuthLayout>
      </View>
    </TouchableWithoutFeedback>
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