import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onReservationSuccess?: () => void;
};

export default function ReservingModal({
  visible,
  onClose,
  onReservationSuccess,
}: Props) {
  const [plate, setPlate] = useState("AB 123 JK");
  const [payment, setPayment] = useState(
    "PayPal Account: username@gmail.com"
  );

  const [editType, setEditType] = useState<"plate" | "payment" | null>(null);
  const [newValue, setNewValue] = useState("");

  const [resultVisible, setResultVisible] = useState(false);
  const [resultType, setResultType] = useState<"success" | "error">("success");

  const openEdit = (type: "plate" | "payment") => {
    setEditType(type);
    setNewValue(type === "plate" ? plate : payment);
  };

  const saveEdit = () => {
    if (newValue.trim()) {
      if (editType === "plate") {
        setPlate(newValue.trim());
      }

      if (editType === "payment") {
        setPayment(newValue.trim());
      }
    }

    setEditType(null);
    setNewValue("");
  };

  const handleReservation = async () => {
    const reservationSuccess = true;

    if (reservationSuccess) {
      await AsyncStorage.setItem("reservationStartTime", String(Date.now()));

      onClose();

      setTimeout(() => {
        setResultType("success");
        setResultVisible(true);
      }, 250);

      setTimeout(() => {
        setResultVisible(false);
        router.push("/home" as any);
      }, 1500);

      onReservationSuccess?.();
    } else {
      setResultType("error");
      setResultVisible(true);
    }
  };

  const closeResult = () => {
    setResultVisible(false);

    if (resultType === "success") {
      router.push("/home" as any);
    }
  };

  return (
    <Modal visible={visible || resultVisible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                resultVisible && styles.resultModalContainer,
              ]}
            >
              {visible && !resultVisible && (
                <>
                  <Pressable style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={18} color="#000000" />
                  </Pressable>

                  <Text style={styles.title}>
                    Rezervimi do të mbahet për 10 min.
                  </Text>

                  <Text style={styles.sectionTitle}>Targa e Mjetit :</Text>

                  <View style={styles.card}>
                    <Text style={styles.cardText}>{plate}</Text>
                  </View>

                  <Pressable
                    style={styles.changeButton}
                    onPress={() => openEdit("plate")}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color="#000000"
                    />

                    <Text style={styles.changeText}>
                      Zgjidh targën tjetër
                    </Text>
                  </Pressable>

                  <Text style={styles.paymentTitle}>Mënyra e Pagesës</Text>

                  <View style={styles.card}>
                    <View style={styles.paymentRow}>
                      <Ionicons name="logo-paypal" size={22} color="#003087" />
                      <Text style={styles.cardText}>{payment}</Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.changeButton}
                    onPress={() => openEdit("payment")}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color="#000000"
                    />

                    <Text style={styles.changeText}>Zgjidh mënyre tjetër</Text>
                  </Pressable>

                  <Pressable
                    style={styles.saveButton}
                    onPress={handleReservation}
                  >
                    <LinearGradient
                      colors={["#3080FF", "#00358B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveGradient}
                    >
                      <Text style={styles.saveText}>Ruaj</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {editType && (
                <View style={styles.editOverlay}>
                  <View style={styles.editBox}>
                    <Pressable
                      style={styles.editCloseButton}
                      onPress={() => setEditType(null)}
                    >
                      <Ionicons name="close" size={18} color="#000000" />
                    </Pressable>

                    <Text style={styles.editTitle}>
                      {editType === "plate"
                        ? "Vendos targën e re"
                        : "Vendos mënyrën e pagesës"}
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder={
                        editType === "plate"
                          ? "P.sh. AB 123 JK"
                          : "P.sh. PayPal Account: email@gmail.com"
                      }
                      placeholderTextColor="#888888"
                      value={newValue}
                      onChangeText={setNewValue}
                      autoCapitalize={editType === "plate" ? "characters" : "none"}
                    />

                    <Pressable style={styles.editSaveButton} onPress={saveEdit}>
                      <LinearGradient
                        colors={["#3080FF", "#00358B"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.editSaveGradient}
                      >
                        <Text style={styles.saveText}>Ruaj</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}

              {resultVisible && (
                <View style={styles.resultBox}>
                  <Pressable style={styles.resultClose} onPress={closeResult}>
                    <Ionicons name="close" size={18} color="#000000" />
                  </Pressable>

                  <View
                    style={[
                      styles.resultCircle,
                      resultType === "success"
                        ? styles.successCircle
                        : styles.errorCircle,
                    ]}
                  >
                    <Ionicons
                      name={resultType === "success" ? "checkmark" : "close"}
                      size={58}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.resultText}>
                    {resultType === "success"
                      ? "Rezervimi u krye me sukses."
                      : "Pati një gabim në sistem."}
                  </Text>

                  {resultType === "error" && (
                    <Pressable
                      style={styles.retryButton}
                      onPress={() => setResultVisible(false)}
                    >
                      <LinearGradient
                        colors={["#3080FF", "#00358B"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.retryGradient}
                      >
                        <Text style={styles.retryText}>Provo Përsëri</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 26,
  },

  resultModalContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },

  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 8,
  },

  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 26,
    color: "#000000",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000000",
  },

  paymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 12,
    color: "#000000",
  },

  card: {
    height: 52,
    backgroundColor: "#ECECEC",
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  cardText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  changeText: {
    fontSize: 13,
    marginLeft: 6,
    color: "#000000",
    fontWeight: "500",
  },

  saveButton: {
    alignSelf: "center",
    marginTop: 24,
    borderRadius: 30,
    overflow: "hidden",
  },

  saveGradient: {
    width: 164,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    zIndex: 99,
  },

  editBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 26,
  },

  editCloseButton: {
    position: "absolute",
    right: 14,
    top: 14,
    padding: 8,
    zIndex: 10,
  },

  editTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 22,
  },

  input: {
    height: 52,
    backgroundColor: "#ECECEC",
    borderRadius: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#000000",
  },

  editSaveButton: {
    alignSelf: "center",
    marginTop: 26,
    borderRadius: 30,
    overflow: "hidden",
  },

  editSaveGradient: {
    width: 150,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },

  resultBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 34,
    alignItems: "center",
  },

  resultClose: {
    position: "absolute",
    right: 12,
    top: 10,
    padding: 8,
  },

  resultCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  successCircle: {
    backgroundColor: "#20D143",
  },

  errorCircle: {
    backgroundColor: "#ED0000",
  },

  resultText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 26,
    borderRadius: 30,
    overflow: "hidden",
  },

  retryGradient: {
    width: 150,
    height: 42,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});