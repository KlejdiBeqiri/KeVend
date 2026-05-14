import api from "../api";

export interface ParkingReviewItem {
  userId: number | null;
  reviewerName: string | null;
  reviewerSurname: string | null;
  reviewId: number;
  rating: number;
  comment: string | null;
  createdAt: string | null;
}

export interface ParkingReviewSummary {
  count: number;
  averageRating: number | null;
  reviews: ParkingReviewItem[];
}

export interface CreateReviewPayload {
  reservationId: number;
  rating: number;
  comment?: string;
}

export async function fetchParkingReviews(parkingId: number): Promise<ParkingReviewSummary> {
  const { data } = await api.get<ParkingReviewSummary>(`/parking-lots/${parkingId}/reviews`);
  return {
    count: data?.count ?? 0,
    averageRating: data?.averageRating ?? null,
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
  };
}

export async function createReview(payload: CreateReviewPayload): Promise<void> {
  await api.post("/reviews", payload);
}

export async function deleteReview(reviewId: number): Promise<void> {
  await api.delete(`/reviews/${reviewId}`);
}
