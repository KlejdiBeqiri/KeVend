package com.keVend.backend.controller;

import com.keVend.backend.dto.ReviewRequest;
import com.keVend.backend.dto.ReviewSummary;
import com.keVend.backend.security.UserDetailsImpl;
import com.keVend.backend.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/reviews")
    public ResponseEntity<Void> create(
            @Valid @RequestBody ReviewRequest req,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        reviewService.createForReservation(principal.getUser(), req);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        reviewService.deleteReview(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/parking-lots/{id}/reviews")
    public ResponseEntity<ReviewSummary> forParking(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.publicSummary(id));
    }
}
