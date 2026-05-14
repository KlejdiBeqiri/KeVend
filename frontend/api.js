import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import axios, { create } from "axios";
import { Platform } from "react-native";

function normalizeBaseUrl(url) {
  return url?.trim().replace(/\/$/, "");
}

function getExpoHostIp() {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    if (!candidate || typeof candidate !== "string") {
      continue;
    }

    const host = candidate.split(":")[0]?.trim();
    if (host) {
      return host;
    }
  }

  return null;
}

function getDefaultApiBaseUrl() {
  const expoHostIp = getExpoHostIp();
  if (expoHostIp) {
    return `http://${expoHostIp}:8080/api/v1`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api/v1";
  }

  return "http://localhost:8080/api/v1";
}

const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL) ||
  getDefaultApiBaseUrl();

const api = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token found");
        }

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;

        if (!newAccessToken || !newRefreshToken) {
          throw new Error("Invalid refresh response");
        }

        const storageEntries = [
          ["accessToken", newAccessToken],
          ["refreshToken", newRefreshToken],
        ];

        if (res.data.role) {
          storageEntries.push(["role", String(res.data.role)]);
        }

        if (res.data.userId !== undefined && res.data.userId !== null) {
          storageEntries.push(["userId", String(res.data.userId)]);
        }

        await AsyncStorage.multiSet(storageEntries);

        return api({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        });
      } catch (refreshError) {
        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "role",
          "userId",
        ]);

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
