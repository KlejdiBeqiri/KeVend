import api from "../api";
import { getCachedValue, hasCachedValue, invalidateCache, setCachedValue } from "./appCache";

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
  maxVehicleHeightMeters: number | null;
  status: "OPEN" | "FULL" | "CLOSED";
  openTime: string | null;
  closeTime: string | null;
  ownerId: number | null;
  distanceKm: number | null;
  priceTiers: ParkingPriceTier[];
  imageUrls: string[];
}

export interface ParkingPriceTier {
  fromHour: number;
  toHour: number;
  price: number;
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

function normalizeParkingLot(parking: ParkingLot): ParkingLot {
  return {
    ...parking,
    priceTiers: Array.isArray(parking.priceTiers) ? parking.priceTiers : [],
    imageUrls: Array.isArray(parking.imageUrls) ? parking.imageUrls : [],
  };
}

const PARKING_LIST_CACHE_KEY = "parking:list";
const PARKING_DETAIL_CACHE_PREFIX = "parking:detail:";
const PARKING_LIST_TTL_MS = 20_000;
const PARKING_DETAIL_TTL_MS = 60_000;
const parkingChangeListeners = new Set<() => void>();

// ─── API Calls ──────────────────────────────────────────────────────────────────

export async function fetchParkingLots(
  filters?: ParkingFilters
): Promise<ParkingLot[]> {
  const hasFilters = Boolean(filters && Object.keys(filters).length > 0);
  if (!hasFilters) {
    const cached = getCachedValue<ParkingLot[]>(PARKING_LIST_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const params: Record<string, string | number | boolean> = {};

  if (filters?.zone) params.zone = filters.zone;
  if (filters?.minPrice != null) params.minPrice = filters.minPrice;
  if (filters?.maxPrice != null) params.maxPrice = filters.maxPrice;
  if (filters?.lat != null) params.lat = filters.lat;
  if (filters?.lng != null) params.lng = filters.lng;
  if (filters?.radiusKm != null) params.radiusKm = filters.radiusKm;
  if (filters?.availableOnly) params.availableOnly = true;

  const { data } = await api.get<ParkingLot[]>("/parking-lots", { params });
  const normalized = data.map(normalizeParkingLot);

  if (!hasFilters) {
    setCachedValue(PARKING_LIST_CACHE_KEY, normalized, PARKING_LIST_TTL_MS);
  }

  normalized.forEach((item) => {
    setCachedValue(`${PARKING_DETAIL_CACHE_PREFIX}${item.id}`, item, PARKING_DETAIL_TTL_MS);
  });

  return normalized;
}

export function getCachedParkingLots(): ParkingLot[] | null {
  return getCachedValue<ParkingLot[]>(PARKING_LIST_CACHE_KEY);
}

export function hasFreshParkingLotsCache(): boolean {
  return hasCachedValue(PARKING_LIST_CACHE_KEY);
}

export async function fetchParkingById(id: number): Promise<ParkingLot> {
  const cacheKey = `${PARKING_DETAIL_CACHE_PREFIX}${id}`;
  const cached = getCachedValue<ParkingLot>(cacheKey);
  if (cached) {
    return cached;
  }

  const { data } = await api.get<ParkingLot>(`/parking-lots/${id}`);
  const normalized = normalizeParkingLot(data);
  setCachedValue(cacheKey, normalized, PARKING_DETAIL_TTL_MS);
  return normalized;
}

export function invalidateParkingCache(id?: number) {
  if (id != null) {
    invalidateCache(`${PARKING_DETAIL_CACHE_PREFIX}${id}`);
  }
  invalidateCache(PARKING_LIST_CACHE_KEY);
  parkingChangeListeners.forEach((listener) => listener());
}

export function subscribeParkingChanges(listener: () => void) {
  parkingChangeListeners.add(listener);
  return () => {
    parkingChangeListeners.delete(listener);
  };
}
