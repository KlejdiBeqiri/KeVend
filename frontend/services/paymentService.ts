import api from "../api";
import { getCachedValue, invalidateCache, setCachedValue } from "./appCache";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PaymentMethod = "CARD" | "DIGITAL_WALLET" | "SMS";
export type PaymentProvider = "STRIPE" | "PAYPAL" | "PAYBY" | "POK" | "TWILIO";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentCurrency = "ALL" | "EUR";

export interface PaymentData {
  id: number;
  reservationId: number;
  parkingName?: string | null;
  vehiclePlate?: string | null;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  currency: PaymentCurrency;
  amount: number;
  platformCommission: number;
  ownerEarnings: number;
  transactionReference: string | null;
  paidAt: string | null;
  createdAt?: string | null;
}

export interface PaymentIntentResult {
  intentId: string;
  clientSecret: string;
  provider: string;
}

export interface PayPalOrderResult {
  orderId: string;
  status: string;
  approveUrl: string | null;
}

const PAYMENTS_CACHE_KEY = "payments:me";
const PAYMENTS_TTL_MS = 20_000;
const paymentChangeListeners = new Set<() => void>();

function emitPaymentsChanged() {
  paymentChangeListeners.forEach((listener) => listener());
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

export async function createPayment(
  reservationId: number,
  method: PaymentMethod,
  provider: PaymentProvider,
  currency: PaymentCurrency,
  transactionReference?: string
): Promise<PaymentData> {
  const { data } = await api.post<PaymentData>("/payments", {
    reservationId,
    method,
    provider,
    currency,
    transactionReference,
  });
  invalidatePaymentsCache();
  return data;
}

export async function createPaymentIntent(
  reservationId: number,
  provider: string = "STRIPE"
): Promise<PaymentIntentResult> {
  const { data } = await api.post<PaymentIntentResult>("/payments/intent", null, {
    params: { reservationId, provider },
  });
  return data;
}

export async function fetchPaymentByReservation(
  reservationId: number
): Promise<PaymentData> {
  const { data } = await api.get<PaymentData>(
    `/payments/by-reservation/${reservationId}`
  );
  return data;
}

export async function fetchMyPayments(): Promise<PaymentData[]> {
  const cached = getCachedValue<PaymentData[]>(PAYMENTS_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const { data } = await api.get<PaymentData[]>("/payments/me");
  setCachedValue(PAYMENTS_CACHE_KEY, data, PAYMENTS_TTL_MS);
  return data;
}

export function getCachedPayments(): PaymentData[] | null {
  return getCachedValue<PaymentData[]>(PAYMENTS_CACHE_KEY);
}

export async function createPayPalOrder(payload: {
  reservationId: number;
  returnUrl: string;
  cancelUrl: string;
  currency: PaymentCurrency;
  paymentMethodId?: number;
}): Promise<PayPalOrderResult> {
  const { data } = await api.post<PayPalOrderResult>("/payments/paypal/order", payload);
  return data;
}

export async function capturePayPalOrder(payload: {
  reservationId: number;
  orderId: string;
  currency: PaymentCurrency;
  paymentMethodId?: number;
}): Promise<PaymentData> {
  const { data } = await api.post<PaymentData>("/payments/paypal/capture", payload);
  invalidatePaymentsCache();
  return data;
}

export function invalidatePaymentsCache() {
  invalidateCache(PAYMENTS_CACHE_KEY);
  emitPaymentsChanged();
}

export function subscribePaymentChanges(listener: () => void) {
  paymentChangeListeners.add(listener);
  return () => {
    paymentChangeListeners.delete(listener);
  };
}
