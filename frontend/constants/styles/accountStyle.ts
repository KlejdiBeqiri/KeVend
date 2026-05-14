import { StyleSheet } from "react-native";

import colors from "../colors";
import fonts from "../fonts";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#010101",
  },

  scrollContent: {
    paddingBottom: 48,
  },

  content: {
    alignItems: "center",
    paddingTop: 18,
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
    paddingHorizontal: 24,
    marginTop: 22,
  },

  sectionTitle: {
    color: colors.white,
    fontSize: 21,
    fontFamily: fonts.interSemiBold,
    marginBottom: 12,
  },

  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
    marginTop: -4,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },

  inputGroup: {
    flex: 1,
  },

  inputGroupWide: {
    width: "100%",
  },

  label: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interRegular,
    marginBottom: 8,
  },

  inputPressable: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#323232",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  inputText: {
    flex: 1,
    color: "#E1E1E1",
    fontSize: 14,
    fontFamily: fonts.interRegular,
  },

  passwordPressable: {
    width: "100%",
    marginBottom: 26,
  },

  profileErrorText: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
    marginBottom: 10,
  },

  profileSavingText: {
    color: "#93C5FD",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
    marginBottom: 6,
  },

  passwordButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  passwordButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },

  cardGroup: {
    marginBottom: 22,
  },

  darkCard: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#323232",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },

  cardContentWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cardText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  primaryPill: {
    backgroundColor: "rgba(48, 128, 255, 0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  primaryPillText: {
    color: "#DCE9FF",
    fontSize: 11,
    fontFamily: fonts.interSemiBold,
  },

  lightCard: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  lightCardText: {
    color: "#000000",
    fontSize: 13,
    fontFamily: fonts.interSemiBold,
  },

  paymentLogo: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },

  paymentInfoWrap: {
    flex: 1,
  },

  paymentText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  paymentMetaText: {
    marginTop: 3,
    color: "#A7A7A7",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },

  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171717",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 2,
  },

  invoiceText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.interSemiBold,
  },

  languageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },

  languagePill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#232323",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    alignItems: "center",
    justifyContent: "center",
  },

  languagePillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },

  languagePillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  languagePillTextActive: {
    color: "#000000",
  },

  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 42,
    marginBottom: 40,
    gap: 12,
  },

  logoutButton: {
    width: 150,
    height: 44,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  logoutText: {
    color: "#E50000",
    fontSize: 17,
    fontFamily: fonts.interSemiBold,
  },

  deleteButton: {
    width: 150,
    height: 44,
    borderRadius: 24,
    backgroundColor: "#E50000",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  plateModal: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },

  paymentModal: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  modalHeaderSpacer: {
    width: 32,
    height: 32,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitle: {
    flex: 1,
    color: "#000000",
    fontSize: 21,
    lineHeight: 24,
    fontFamily: fonts.interSemiBold,
    textAlign: "center",
    marginBottom: 10,
  },

  modalSubtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.interRegular,
    textAlign: "center",
    marginBottom: 20,
  },

  modalLabel: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: fonts.interSemiBold,
    marginBottom: 8,
  },

  modalInput: {
    width: "100%",
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 18,
    color: "#000000",
    fontSize: 14,
    fontFamily: fonts.interRegular,
    marginBottom: 14,
  },

  modalErrorText: {
    color: "#DC2626",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.interRegular,
    marginTop: -4,
    marginBottom: 10,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  modalCheckbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 3,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxText: {
    color: "rgba(0, 0, 0, 0.9)",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },

  modalFooter: {
    marginTop: 24,
    flexDirection: "row",
    gap: 10,
  },

  modalGhostButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 24,
    backgroundColor: "#EDEFF3",
    alignItems: "center",
    justifyContent: "center",
  },

  modalGhostText: {
    color: "#111827",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },

  modalSaveButton: {
    width: 146,
    minHeight: 44,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
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
});

export default styles;
