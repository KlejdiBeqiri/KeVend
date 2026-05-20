package com.keVend.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * FR-16 / F-10: per-parking aggregate. Average + individual reviews are only
 * exposed once the parking has at least {@code MIN_REVIEWS_PUBLIC} reviews;
 * before that, the count is the only field returned.
 */
@Data
@AllArgsConstructor
public class ReviewSummary {

    private long count;
    private Double averageRating;
    private List<Item> reviews;

    @Data
    @AllArgsConstructor
    public static class Item {
        private Long userId;
        private String reviewerName;
        private String reviewerSurname;
        private Long reviewId;
        private int rating;
        private String comment;
        private String createdAt;
    }
}
