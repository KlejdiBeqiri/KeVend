package com.keVend.backend.service;

import com.keVend.backend.dto.ReviewRequest;
import com.keVend.backend.dto.ReviewSummary;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.Review;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReservationService reservationService;
    private final I18n i18n;

    @Transactional
    public Review createForReservation(User driver, ReviewRequest req) {
        Reservation r = reservationService.loadOrThrow(req.getReservationId());

        if (!r.getDriver().getId().equals(driver.getId())) {
            throw i18n.forbidden("error.review.not_your_reservation");
        }
        if (r.getStatus() != Reservation.ReservationStatus.COMPLETED) {
            throw i18n.badRequest("error.review.session_not_completed");
        }
        if (reviewRepository.existsByReservationId(r.getId())) {
            throw i18n.conflict("error.review.already_reviewed");
        }

        Review review = new Review();
        review.setDriver(driver);
        review.setParking(r.getParking());
        review.setReservation(r);
        review.setRating(req.getRating());
        review.setComment(req.getComment());
        return reviewRepository.save(review);
    }

    public ReviewSummary publicSummary(Long parkingId) {
        List<Review> reviews = reviewRepository.findByParkingIdOrderByCreatedAtDesc(parkingId);
        long count = reviews.size();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);

        List<ReviewSummary.Item> items = reviews.stream()
                .map(r -> new ReviewSummary.Item(
                        r.getDriver() != null ? r.getDriver().getId() : null,
                        r.getDriver() != null ? r.getDriver().getName() : null,
                        r.getDriver() != null ? r.getDriver().getSurname() : null,
                        r.getId(),
                        r.getRating(),
                        r.getComment(),
                        r.getCreatedAt() != null ? r.getCreatedAt().toString() : null))
                .toList();

        return new ReviewSummary(count, Math.round(avg * 10.0) / 10.0, items);
    }

    @Transactional
    public void deleteReview(User driver, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> i18n.notFound("error.review.not_found"));

        if (review.getDriver() == null || !review.getDriver().getId().equals(driver.getId())) {
            throw i18n.forbidden("error.review.not_your_review");
        }

        reviewRepository.delete(review);
    }
}
