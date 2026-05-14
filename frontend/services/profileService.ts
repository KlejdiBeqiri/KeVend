import api from "../api";
import { getCachedValue, invalidateCache, setCachedValue } from "./appCache";

export type PaymentProvider = "PAYPAL" | "STRIPE" | "PAYBY" | "POK" | "TWILIO";

export interface UserVehicle {
  id: number;
  plate: string;
  primaryVehicle: boolean;
}

export interface UserPaymentMethod {
  id: number;
  provider: PaymentProvider;
  accountEmail: string;
  displayLabel: string | null;
  primaryMethod: boolean;
}

export interface UserProfile {
  id: number;
  name: string | null;
  surname: string | null;
  email: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  preferredLocale: string | null;
  vehicles: UserVehicle[];
  paymentMethods: UserPaymentMethod[];
  createdAt: string;
}

export interface AddVehiclePayload {
  plate: string;
  primaryVehicle?: boolean;
}

export interface AddPaymentMethodPayload {
  provider: PaymentProvider;
  accountEmail: string;
  displayLabel?: string;
  primaryMethod?: boolean;
}

export interface UpdateProfilePayload {
  name: string;
  surname: string;
  phone: string;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    vehicles: Array.isArray(profile.vehicles) ? profile.vehicles : [],
    paymentMethods: Array.isArray(profile.paymentMethods) ? profile.paymentMethods : [],
  };
}

const PROFILE_CACHE_KEY = "profile:me";
const PROFILE_TTL_MS = 20_000;

export async function fetchMyProfile(): Promise<UserProfile> {
  const cached = getCachedValue<UserProfile>(PROFILE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const { data } = await api.get<UserProfile>("/users/me");
  const normalized = normalizeProfile(data);
  setCachedValue(PROFILE_CACHE_KEY, normalized, PROFILE_TTL_MS);
  return normalized;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<void> {
  await api.put("/users/me", {
    name: payload.name.trim(),
    surname: payload.surname.trim(),
    phone: payload.phone.trim(),
  });
  invalidateProfileCache();
}

export async function updatePreferredLocale(locale: "sq" | "en"): Promise<void> {
  await api.put(`/users/me/locale?locale=${locale}`);
  invalidateProfileCache();
}

export async function addVehicle(payload: AddVehiclePayload): Promise<UserVehicle> {
  const { data } = await api.post<UserVehicle>("/users/me/vehicles", payload);
  invalidateProfileCache();
  return data;
}

export async function deleteVehicle(id: number): Promise<void> {
  await api.delete(`/users/me/vehicles/${id}`);
  invalidateProfileCache();
}

export async function addPaymentMethod(
  payload: AddPaymentMethodPayload
): Promise<UserPaymentMethod> {
  const normalizedPayload = {
    ...payload,
    accountEmail: payload.accountEmail.trim().toLowerCase(),
    displayLabel: payload.displayLabel?.trim(),
  };
  const { data } = await api.post<UserPaymentMethod>(
    "/users/me/payment-methods",
    normalizedPayload
  );
  invalidateProfileCache();
  return data;
}

export async function deletePaymentMethod(id: number): Promise<void> {
  await api.delete(`/users/me/payment-methods/${id}`);
  invalidateProfileCache();
}

export function invalidateProfileCache() {
  invalidateCache(PROFILE_CACHE_KEY);
}
