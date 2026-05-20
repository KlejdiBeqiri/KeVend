package com.keVend.backend.controller;

import com.keVend.backend.dto.PaymentRequest;
import com.keVend.backend.dto.PaymentResponse;
import com.keVend.backend.dto.PayPalOrderCaptureRequest;
import com.keVend.backend.dto.PayPalOrderCreateRequest;
import com.keVend.backend.dto.PayPalOrderResponse;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.payments.PaymentGateway;
import com.keVend.backend.security.UserDetailsImpl;
import com.keVend.backend.service.PayPalSandboxService;
import com.keVend.backend.service.PaymentService;
import com.keVend.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final ReservationService reservationService;
    private final PayPalSandboxService payPalSandboxService;
    private final ObjectProvider<PaymentGateway> gateways;
    private final I18n i18n;

    @PostMapping
    public ResponseEntity<PaymentResponse> pay(
            @Valid @RequestBody PaymentRequest req,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(paymentService.pay(principal.getUser(), req));
    }

    @GetMapping("/by-reservation/{reservationId}")
    public ResponseEntity<PaymentResponse> byReservation(
            @PathVariable Long reservationId,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(paymentService.forReservation(reservationId, principal.getUser()));
    }

    @GetMapping("/me")
    public ResponseEntity<java.util.List<PaymentResponse>> myPayments(
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(paymentService.myPayments(principal.getUser()));
    }

    @PostMapping("/intent")
    public ResponseEntity<Map<String, String>> intent(
            @RequestParam Long reservationId,
            @RequestParam(defaultValue = "STRIPE") String provider,
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        var reservation = reservationService.loadOrThrow(reservationId);
        if (!reservation.getDriver().getId().equals(principal.getUser().getId())) {
            throw i18n.forbidden("error.payment.not_your_reservation");
        }
        PaymentGateway gateway = gateways.stream()
                .filter(g -> g.providerId().equalsIgnoreCase(provider))
                .findFirst()
                .orElseThrow(() -> i18n.status(HttpStatus.SERVICE_UNAVAILABLE,
                        "error.payment.provider_unavailable", provider));
        var result = gateway.createIntent(reservation);
        return ResponseEntity.ok(Map.of(
                "intentId", result.intentId(),
                "clientSecret", result.clientSecret(),
                "provider", provider
        ));
    }

    @PostMapping("/paypal/order")
    public ResponseEntity<PayPalOrderResponse> createPayPalOrder(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody PayPalOrderCreateRequest request
    ) {
        return ResponseEntity.ok(payPalSandboxService.createOrder(principal.getUser(), request));
    }

    @PostMapping("/paypal/capture")
    public ResponseEntity<PaymentResponse> capturePayPalOrder(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody PayPalOrderCaptureRequest request
    ) {
        return ResponseEntity.ok(payPalSandboxService.captureOrder(principal.getUser(), request));
    }
}
