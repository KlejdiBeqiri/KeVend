import api from "../api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ParkingLot {
  id: number;
  name: string;
  zone: string | null;
  latitude: number;
  longitude: number;
  totalSpots: number;
  availableSpots: number;
  pricePerHour: number;
  status: "OPEN" | "FULL" | "CLOSED";
  openTime: string | null;
  closeTime: string | null;
  ownerId: number | null;
  distanceKm: number | null;
}

export interface ParkingFilters {
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  availableOnly?: boolean;
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

export async function fetchParkingLots(
  filters?: ParkingFilters
): Promise<ParkingLot[]> {
  const params: Record<string, string | number | boolean> = {};

  if (filters?.zone) params.zone = filters.zone;
  if (filters?.minPrice != null) params.minPrice = filters.minPrice;
  if (filters?.maxPrice != null) params.maxPrice = filters.maxPrice;
  if (filters?.lat != null) params.lat = filters.lat;
  if (filters?.lng != null) params.lng = filters.lng;
  if (filters?.radiusKm != null) params.radiusKm = filters.radiusKm;
  if (filters?.availableOnly) params.availableOnly = true;

  const { data } = await api.get<ParkingLot[]>("/parking-lots", { params });
  return data;
}

export async function fetchParkingById(id: number): Promise<ParkingLot> {
  const { data } = await api.get<ParkingLot>(`/parking-lots/${id}`);
  return data;
}
