import api from "../api";
import {
  getCachedValue,
  hasCachedValue,
  invalidateCache,
  peekCachedValue,
  setCachedValue,
} from "./appCache";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ReservationStatus =
  | "SOFT_HOLD"
  | "CONFIRMED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export interface ReservationData {
  id: number;
  parkingId: number;
  parkingName: string;
  parkingAvailableSpots: number | null;
  spotsReserved: number;
  status: ReservationStatus;
  holdExpiresAt: string | null;
  startTime: string | null;
  endTime: string | null;
  vehiclePlate: string | null;
  totalCost: number;
  platformCommission: number;
  ownerRevenue: number;
}

export interface SoftHoldPayload {
  parkingId: number;
  spots: number;
  hours: number;
  vehiclePlate: string;
  promoCode?: string;
}

const RESERVATION_HISTORY_CACHE_KEY = "reservation:history";
const RESERVATION_CURRENT_CACHE_KEY = "reservation:current";
const RESERVATION_TTL_MS = 15_000;
const reservationChangeListeners = new Set<() => void>();

function emitReservationChanged() {
  reservationChangeListeners.forEach((listener) => listener());
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

export async function createSoftHold(
  payload: SoftHoldPayload
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>("/reservations", payload);
  invalidateReservationCache();
  return data;
}

export async function confirmReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>(
    `/reservations/${id}/confirm`
  );
  invalidateReservationCache();
  return data;
}

export async function confirmReservationForTesting(
  id: number
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>(
    `/reservations/${id}/confirm-test`
  );
  invalidateReservationCache();
  return data;
}

export async function cancelReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>(
    `/reservations/${id}/cancel`
  );
  invalidateReservationCache();
  return data;
}

export async function fetchReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.get<ReservationData>(`/reservations/${id}`);
  return data;
}

export async function fetchMyHistory(): Promise<ReservationData[]> {
  const cached = getCachedValue<ReservationData[]>(RESERVATION_HISTORY_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const { data } = await api.get<ReservationData[]>("/reservations/me");
  setCachedValue(RESERVATION_HISTORY_CACHE_KEY, data, RESERVATION_TTL_MS);
  return data;
}

export function getCachedReservationHistory(): ReservationData[] | null {
  return getCachedValue<ReservationData[]>(RESERVATION_HISTORY_CACHE_KEY);
}

export function peekReservationHistorySnapshot(): ReservationData[] | null {
  return peekCachedValue<ReservationData[]>(RESERVATION_HISTORY_CACHE_KEY);
}

export async function fetchCurrentReservation(): Promise<ReservationData | null> {
  if (hasCachedValue(RESERVATION_CURRENT_CACHE_KEY)) {
    return getCachedValue<ReservationData | null>(RESERVATION_CURRENT_CACHE_KEY);
  }

  const { data } = await api.get<ReservationData | null>("/reservations/me/current");
  setCachedValue(RESERVATION_CURRENT_CACHE_KEY, data, RESERVATION_TTL_MS);
  return data;
}

export function getCachedCurrentReservation(): ReservationData | null {
  return getCachedValue<ReservationData | null>(RESERVATION_CURRENT_CACHE_KEY);
}

export function peekCurrentReservationSnapshot(): ReservationData | null {
  return peekCachedValue<ReservationData | null>(RESERVATION_CURRENT_CACHE_KEY);
}

export function invalidateReservationCache() {
  invalidateCache(RESERVATION_HISTORY_CACHE_KEY, RESERVATION_CURRENT_CACHE_KEY);
  emitReservationChanged();
}

export function subscribeReservationChanges(listener: () => void) {
  reservationChangeListeners.add(listener);
  return () => {
    reservationChangeListeners.delete(listener);
  };
}
