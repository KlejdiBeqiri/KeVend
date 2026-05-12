import api from "../api";

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
  spotsReserved: number;
  status: ReservationStatus;
  holdExpiresAt: string | null;
  startTime: string | null;
  endTime: string | null;
  totalCost: number;
  platformCommission: number;
  ownerRevenue: number;
}

export interface SoftHoldPayload {
  parkingId: number;
  spots: number;
  hours?: number;
  promoCode?: string;
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

export async function createSoftHold(
  payload: SoftHoldPayload
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>("/reservations", payload);
  return data;
}

export async function confirmReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>(
    `/reservations/${id}/confirm`
  );
  return data;
}

export async function cancelReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.post<ReservationData>(
    `/reservations/${id}/cancel`
  );
  return data;
}

export async function fetchReservation(
  id: number
): Promise<ReservationData> {
  const { data } = await api.get<ReservationData>(`/reservations/${id}`);
  return data;
}

export async function fetchMyHistory(): Promise<ReservationData[]> {
  const { data } = await api.get<ReservationData[]>("/reservations/me");
  return data;
}
