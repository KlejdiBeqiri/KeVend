package com.keVend.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keVend.backend.dto.PayPalOrderCaptureRequest;
import com.keVend.backend.dto.PayPalOrderCreateRequest;
import com.keVend.backend.dto.PayPalOrderResponse;
import com.keVend.backend.dto.PaymentRequest;
import com.keVend.backend.dto.PaymentResponse;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Payment;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.User;
import com.keVend.backend.model.UserPaymentMethod;
import com.keVend.backend.repository.UserPaymentMethodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PayPalSandboxService {

    private final ReservationService reservationService;
    private final PaymentService paymentService;
    private final UserPaymentMethodRepository userPaymentMethodRepository;
    private final I18n i18n;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${paypal.client-id:}")
    private String clientId;

    @Value("${paypal.client-secret:}")
    private String clientSecret;

    @Value("${paypal.base-url:https://api-m.sandbox.paypal.com}")
    private String baseUrl;

    @Value("${paypal.all-per-eur:95.53}")
    private BigDecimal allPerEur;

    public PayPalOrderResponse createOrder(User driver, PayPalOrderCreateRequest request) {
        Reservation reservation = reservationService.loadOrThrow(request.getReservationId());
        ensureReservationOwnership(driver, reservation);
        ensurePayPalConfigured();
        ensurePayPalCurrency(request.getCurrency());
        UserPaymentMethod method = validatePaymentMethod(driver, request.getPaymentMethodId());

        try {
            String accessToken = fetchAccessToken();
            BigDecimal amountInEur = convertAllToEur(reservation.getTotalCost());
            java.util.Map<String, Object> paypalSource = new java.util.LinkedHashMap<>();
            if (method != null && method.getAccountEmail() != null && !method.getAccountEmail().isBlank()) {
                paypalSource.put("email_address", method.getAccountEmail().trim().toLowerCase());
            }
            paypalSource.put("experience_context", java.util.Map.of(
                    "return_url", request.getReturnUrl(),
                    "cancel_url", request.getCancelUrl(),
                    "user_action", "PAY_NOW",
                    "shipping_preference", "NO_SHIPPING"
            ));

            String body = objectMapper.writeValueAsString(java.util.Map.of(
                    "intent", "CAPTURE",
                    "payment_source", java.util.Map.of(
                            "paypal", paypalSource
                    ),
                    "purchase_units", java.util.List.of(java.util.Map.of(
                            "reference_id", "reservation-" + reservation.getId(),
                            "description", "KeVend parking reservation #" + reservation.getId(),
                                    "amount", java.util.Map.of(
                                    "currency_code", request.getCurrency().name(),
                                    "value", amountInEur.toPlainString()
                            )
                    ))
            ));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v2/checkout/orders"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("PayPal-Request-Id", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_create_failed");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String approveUrl = null;
            for (JsonNode link : root.path("links")) {
                String rel = link.path("rel").asText();
                if ("approve".equalsIgnoreCase(rel)
                        || "payer-action".equalsIgnoreCase(rel)
                        || "approve-payment".equalsIgnoreCase(rel)) {
                    approveUrl = link.path("href").asText(null);
                    break;
                }
            }

            return PayPalOrderResponse.builder()
                    .orderId(root.path("id").asText())
                    .status(root.path("status").asText())
                    .approveUrl(approveUrl)
                    .build();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_create_failed");
        } catch (IOException ex) {
            throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_create_failed");
        }
    }

    public PaymentResponse captureOrder(User driver, PayPalOrderCaptureRequest request) {
        Reservation reservation = reservationService.loadOrThrow(request.getReservationId());
        ensureReservationOwnership(driver, reservation);
        ensurePayPalConfigured();
        ensurePayPalCurrency(request.getCurrency());
        UserPaymentMethod method = validatePaymentMethod(driver, request.getPaymentMethodId());

        try {
            String accessToken = fetchAccessToken();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v2/checkout/orders/" + request.getOrderId() + "/capture"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("PayPal-Request-Id", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString("{}"))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_capture_failed");
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!"COMPLETED".equalsIgnoreCase(root.path("status").asText())) {
                throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_capture_failed");
            }

            String payerEmail = root.path("payment_source")
                    .path("paypal")
                    .path("email_address")
                    .asText("")
                    .trim()
                    .toLowerCase();
            if (method != null && !payerEmail.isBlank()
                    && !payerEmail.equals(method.getAccountEmail().trim().toLowerCase())) {
                throw i18n.badRequest("error.payment.paypal_email_mismatch");
            }

            PaymentRequest paymentRequest = new PaymentRequest();
            BigDecimal amountInEur = convertAllToEur(reservation.getTotalCost());
            paymentRequest.setReservationId(reservation.getId());
            paymentRequest.setMethod(Payment.PaymentMethod.DIGITAL_WALLET);
            paymentRequest.setProvider(Payment.PaymentProvider.PAYPAL);
            paymentRequest.setCurrency(request.getCurrency());
            paymentRequest.setAmount(amountInEur);
            paymentRequest.setTransactionReference(root.path("id").asText(request.getOrderId()));
            return paymentService.pay(driver, paymentRequest);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_capture_failed");
        } catch (IOException ex) {
            throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_capture_failed");
        }
    }

    private void ensureReservationOwnership(User driver, Reservation reservation) {
        if (!reservation.getDriver().getId().equals(driver.getId())) {
            throw i18n.forbidden("error.payment.not_your_reservation");
        }
    }

    private void ensurePayPalConfigured() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw i18n.status(HttpStatus.SERVICE_UNAVAILABLE, "error.payment.provider_unavailable", "PAYPAL");
        }
    }

    private void ensurePayPalCurrency(Payment.Currency currency) {
        if (currency != Payment.Currency.EUR) {
            throw i18n.badRequest("error.payment.paypal_currency_not_supported");
        }
    }

    private BigDecimal convertAllToEur(BigDecimal amountInAll) {
        if (amountInAll == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return amountInAll
                .divide(allPerEur, 2, RoundingMode.HALF_UP)
                .max(new BigDecimal("0.01"));
    }

    private UserPaymentMethod validatePaymentMethod(User driver, Long paymentMethodId) {
        if (paymentMethodId == null) {
            return null;
        }

        UserPaymentMethod method = userPaymentMethodRepository.findByIdAndUserId(paymentMethodId, driver.getId())
                .orElseThrow(() -> i18n.notFound("error.user.payment_method_not_found"));
        if (method.getProvider() != Payment.PaymentProvider.PAYPAL) {
            throw i18n.badRequest("error.user.payment_method_provider_invalid");
        }
        return method;
    }

    private String fetchAccessToken() throws IOException, InterruptedException {
        String auth = Base64.getEncoder().encodeToString(
                (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8)
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/oauth2/token"))
                .header("Authorization", "Basic " + auth)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw i18n.status(HttpStatus.BAD_GATEWAY, "error.payment.paypal_auth_failed");
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.path("access_token").asText();
    }
}
