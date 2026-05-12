import api from "../api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PaymentMethod = "CARD" | "DIGITAL_WALLET" | "SMS";
export type PaymentProvider = "STRIPE" | "PAYPAL" | "PAYBY" | "POK" | "TWILIO";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentCurrency = "ALL" | "EUR";

export interface PaymentData {
  id: number;
  reservationId: number;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  currency: PaymentCurrency;
  amount: number;
  platformCommission: number;
  ownerEarnings: number;
  transactionReference: string | null;
  paidAt: string | null;
}

export interface PaymentIntentResult {
  intentId: string;
  clientSecret: string;
  provider: string;
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
