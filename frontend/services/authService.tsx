import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";

import api from "@/api";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: number;
};

export type PasswordResetSession = {
  email: string;
  code: string;
};

type RegisterPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const PASSWORD_RESET_EMAIL_KEY = "passwordResetEmail";
const PASSWORD_RESET_CODE_KEY = "passwordResetCode";

export const saveTokens = async (authResponse: AuthResponse) => {
  await AsyncStorage.multiSet([
    ["accessToken", authResponse.accessToken],
    ["refreshToken", authResponse.refreshToken],
    ["role", authResponse.role],
    ["userId", String(authResponse.userId)],
  ]);
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove(["accessToken", "refreshToken", "role", "userId"]);
};

export const getAccessToken = () => AsyncStorage.getItem("accessToken");
export const getRefreshToken = () => AsyncStorage.getItem("refreshToken");

export const savePasswordResetSession = async ({ email, code }: PasswordResetSession) => {
  await AsyncStorage.multiSet([
    [PASSWORD_RESET_EMAIL_KEY, normalizeEmail(email)],
    [PASSWORD_RESET_CODE_KEY, code],
  ]);
};

export const getPasswordResetSession = async (): Promise<PasswordResetSession | null> => {
  const entries = await AsyncStorage.multiGet([
    PASSWORD_RESET_EMAIL_KEY,
    PASSWORD_RESET_CODE_KEY,
  ]);

  const email = entries[0]?.[1] ?? "";
  const code = entries[1]?.[1] ?? "";

  if (!email || !code) {
    return null;
  }

  return { email, code };
};

export const clearPasswordResetSession = async () => {
  await AsyncStorage.multiRemove([
    PASSWORD_RESET_EMAIL_KEY,
    PASSWORD_RESET_CODE_KEY,
  ]);
};

export const login = async (email: string, password: string) => {
  const response = await api.post<AuthResponse>("/auth/login", {
    email: normalizeEmail(email),
    password,
  });

  await saveTokens(response.data);
  return response.data;
};

export const register = async ({
  email,
  firstName,
  lastName,
  phone,
  password,
}: RegisterPayload) => {
  const response = await api.post<AuthResponse>("/auth/register", {
    name: firstName.trim(),
    surname: lastName.trim(),
    email: normalizeEmail(email),
    password,
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
  });

  await saveTokens(response.data);
  return response.data;
};

export const requestPasswordReset = async (email: string) => {
  await clearPasswordResetSession();
  await api.post("/auth/forgot-password", {
    email: normalizeEmail(email),
  });
};

export const requestPasswordResetForCurrentUser = async () => {
  await clearPasswordResetSession();
  const { data } = await api.post<{ email: string }>("/auth/forgot-password/me");
  return normalizeEmail(data.email);
};

export const verifyPasswordResetCode = async (email: string, code: string) => {
  await api.post("/auth/verify-reset-code", {
    email: normalizeEmail(email),
    code,
  });
};

export const resetPassword = async (email: string, code: string, newPassword: string) => {
  await api.post("/auth/reset-password", {
    email: normalizeEmail(email),
    code,
    newPassword,
  });
  await clearPasswordResetSession();
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  await api.put("/users/me/password", {
    currentPassword,
    newPassword,
  });
  await clearTokens();
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
};
