import { StyleSheet } from "react-native";
import colors from "../colors";
import fonts from "../fonts";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#010101",
  },

  scrollContent: {
    paddingBottom: 45,
  },

  content: {
    alignItems: "center",
    paddingTop: 20,
  },

  avatarWrapper: {
    width: 118,
    height: 116,
    borderRadius: 59,
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#8A8A8A",
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    width: "100%",
    paddingHorizontal: 27,
    marginTop: 20,
  },

  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.interSemiBold,
    marginBottom: 7,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 27,
  },

  inputGroup: {
    width: "48%",
  },

  label: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.interSemiBold,
    marginBottom: 7,
  },

  labelLarge: {
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.interSemiBold,
    marginBottom: 7,
  },

  input: {
    height: 40,
    borderRadius: 15,
    backgroundColor: "#323232",
    paddingHorizontal: 13,
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.interRegular,
  },

  inputPressable: {
    height: 40,
    borderRadius: 15,
    backgroundColor: "#323232",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputText: {
      flex: 1,
    color: "#E1E1E1",
    fontSize: 14,
    fontFamily: fonts.interRegular,
  },

  passwordPressable: {
    width: "48%",
    alignSelf: "flex-end",  // ← replaces marginTop: 25
  },

  passwordButton: {
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  passwordButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  cardGroup: {
    marginBottom: 22,
  },

  darkCard: {
    height: 41,
    borderRadius: 13,
    backgroundColor: "#323232",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  cardText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  lightCard: {
    height: 41,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.77)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  lightCardText: {
    color: "#000000",
    fontSize: 13,
    fontFamily: fonts.interSemiBold,
  },

  paypalIcon: {
    color: "#008CFF",
    fontSize: 22,
    fontFamily: fonts.interSemiBold,
    marginRight: 10,
  },

  paymentText: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },

  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  invoiceText: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.interSemiBold,
  },

  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 40,
    gap: 15,
  },

  logoutButton: {
    width: 150,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  logoutText: {
    color: "#E50000",
    fontSize: 18,
    fontFamily: fonts.interSemiBold,
  },

  deleteButton: {
    width: 150,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E50000",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.interSemiBold,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(79, 79, 79, 0.49)",
    justifyContent: "center",
    alignItems: "center",
  },

  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    justifyContent: "flex-end",
  },

  editModal: {
    width: "100%",
    height: 360,
    backgroundColor: "#323232",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  editPhoneModal: {
    width: "100%",
    height: 520,
    backgroundColor: "#323232",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 42,
  },

  editCancel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.interRegular,
  },

  editTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.interSemiBold,
    letterSpacing: 1,
  },

  editSave: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  editInput: {
    width: "100%",
    height: 50,
    borderRadius: 13,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 15,
    color: "#000000",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },

  phoneSectionLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: fonts.interRegular,
    marginBottom: 8,
  },

  phoneBox: {
    backgroundColor: "#F0F0F0",
    borderRadius: 13,
    overflow: "hidden",
    marginBottom: 34,
  },

  phoneRow: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  phoneLeftText: {
    width: 75,
    color: "#000000",
    fontSize: 12,
    fontFamily: fonts.interSemiBold,
  },

  phoneCountryText: {
    flex: 1,
    color: "#43A047",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },

  phoneInput: {
    flex: 1,
    height: "100%",
    color: "#000000",
    fontSize: 12,
    fontFamily: fonts.interRegular,
    padding: 0,
  },

  plateModal: {
    width: 383,
    height: 438,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 36,
  },

  paymentModal: {
    width: 383,
    height: 363,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 36,
  },

  closeButton: {
    position: "absolute",
    right: 16,
    top: 14,
    zIndex: 10,
  },

  modalTitle: {
    color: "#000000",
    fontSize: 20,
    lineHeight: 22,
    fontFamily: fonts.interSemiBold,
    textAlign: "center",
    marginBottom: 20,
  },

  modalLabel: {
    color: "#000000",
    fontSize: 16,
    lineHeight: 18,
    fontFamily: fonts.interSemiBold,
    marginBottom: 7,
  },

  modalInput: {
    width: "100%",
    height: 50,
    borderRadius: 13,
    backgroundColor: "#ECECEC",
    paddingHorizontal: 20,
    color: "#000000",
    fontSize: 14,
    fontFamily: fonts.interRegular,
    marginBottom: 13,
  },

  modalPasswordInput: {
    width: "100%",
    height: 50,
    borderRadius: 13,
    backgroundColor: "#ECECEC",
    paddingLeft: 20,
    paddingRight: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  passwordModalTextInput: {
    flex: 1,
    height: "100%",
    color: "#000000",
    fontSize: 14,
    fontFamily: fonts.interRegular,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },

  modalCheckbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 1,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxText: {
    color: "rgba(0, 0, 0, 0.9)",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },

  modalSaveButton: {
    width: 164,
    height: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 20,
  },

  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: fonts.interSemiBold,
  },

  logoutModal: {
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  logoutTitle: {
    color: "#000000",
    fontSize: 18,
    fontFamily: fonts.interSemiBold,
    marginBottom: 20,
  },

  logoutButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  cancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  cancelText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  confirmLogoutButton: {
    flex: 1,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#E50000",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmLogoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },
sheetOverlay: {
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0,0,0,0.35)",
},

sheetContainer: {
  height: "58%",
  backgroundColor: "#323232", 
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: 8,
},

phoneSheetContainer: {
  height: "70%",
  backgroundColor: "#323232", 
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: 8,
},

sheetHandle: {
  display: "none", 
},

sheetHeader: {
  height: 52,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 20,
},

sheetCancel: {
  fontSize: 18,
  fontWeight: "400",
  color: "#FFFFFF", 
},

sheetTitle: {
  fontSize: 18,
  fontWeight: "500",
  color: "#FFFFFF", 
  letterSpacing: 1,
},

sheetSave: {
  fontSize: 18,
  fontWeight: "600",
  color: "#FFFFFF", 
  letterSpacing: 1,
},

sheetContent: {
  paddingHorizontal: 20,
  paddingTop: 38,
},

sheetInput: {
  height: 50,
  borderRadius: 13,
  backgroundColor: "#F0F0F0", 
  paddingHorizontal: 18,
  fontSize: 16,
  fontWeight: "500",
  color: "#000000",
  letterSpacing: 1,
},
photoOptionsModal: {
  width: "82%",
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  overflow: "hidden",
},

photoOptionRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingVertical: 16,
  paddingHorizontal: 20,
},

photoOptionText: {
  fontSize: 16,
  color: "#000000",
},

photoOptionDivider: {
  height: 1,
  backgroundColor: "#E5E5E5",
},
});

export default styles;