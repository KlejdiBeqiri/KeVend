// services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveTokens = async (authResponse: {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId: number;
}) => {
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