package com.keVend.backend.controller;

import com.keVend.backend.dto.ReservationResponse;
import com.keVend.backend.dto.SoftHoldRequest;
import com.keVend.backend.security.UserDetailsImpl;
import com.keVend.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponse> hold(
            @Valid @RequestBody SoftHoldRequest req,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.createSoftHold(principal.getUser(), req));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ReservationResponse> confirm(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.confirm(id, principal.getUser()));
    }

    @PostMapping("/{id}/confirm-test")
    public ResponseEntity<ReservationResponse> confirmTest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.confirmForTesting(id, principal.getUser()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ReservationResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.cancel(id, principal.getUser()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.get(id, principal.getUser()));
    }

    /** FR-10: last 10 sessions for the authenticated driver. */
    @GetMapping("/me")
    public ResponseEntity<List<ReservationResponse>> myHistory(
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.historyForDriver(principal.getUser().getId()));
    }

    @GetMapping("/me/current")
    public ResponseEntity<ReservationResponse> myCurrentReservation(
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(reservationService.currentForDriver(principal.getUser().getId()));
    }
}
