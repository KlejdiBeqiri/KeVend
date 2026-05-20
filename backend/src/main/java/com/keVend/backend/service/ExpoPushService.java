package com.keVend.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keVend.backend.model.Notification;
import com.keVend.backend.model.UserPushToken;
import com.keVend.backend.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpoPushService {

    private final UserPushTokenRepository userPushTokenRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.push.expo.base-url:https://exp.host/--/api/v2/push/send}")
    private String expoPushUrl;

    public boolean send(Notification notification) {
        List<UserPushToken> tokens = userPushTokenRepository.findByUserIdAndActiveTrue(
                notification.getUser().getId()
        );
        if (tokens.isEmpty()) {
            return true;
        }

        boolean deliveredAtLeastOnce = false;
        for (UserPushToken pushToken : tokens) {
            if (sendSingle(notification, pushToken)) {
                deliveredAtLeastOnce = true;
            }
        }
        return deliveredAtLeastOnce;
    }

    private boolean sendSingle(Notification notification, UserPushToken pushToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(expoPushUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(buildPayload(notification, pushToken.getToken()))
                    ))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("[notification] Expo push failed status={} user={} token={}",
                        response.statusCode(), notification.getUser().getId(), pushToken.getId());
                return false;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.path("data");
            String status = data.isArray() ? data.path(0).path("status").asText() : data.path("status").asText();
            String detailsError = data.isArray()
                    ? data.path(0).path("details").path("error").asText("")
                    : data.path("details").path("error").asText("");

            if ("ok".equalsIgnoreCase(status)) {
                return true;
            }

            if ("DeviceNotRegistered".equalsIgnoreCase(detailsError)) {
                pushToken.setActive(false);
                userPushTokenRepository.save(pushToken);
            }

            log.warn("[notification] Expo push not accepted user={} token={} status={} details={}",
                    notification.getUser().getId(), pushToken.getId(), status, detailsError);
            return false;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("[notification] Expo push exception user={} token={}: {}",
                    notification.getUser().getId(), pushToken.getId(), ex.getMessage());
            return false;
        }
    }

    private Map<String, Object> buildPayload(Notification notification, String token) {
        String route = notification.getType() == Notification.NotificationType.EXPIRY_REACHED
                ? "home"
                : "notifications";

        Map<String, Object> payload = new HashMap<>();
        payload.put("to", token);
        payload.put("sound", "default");
        payload.put("title", titleFor(notification));
        payload.put("body", notification.getMessage());
        payload.put("channelId", "default");
        payload.put("data", Map.of(
                "notificationId", notification.getId(),
                "reservationId", notification.getReservation() != null ? notification.getReservation().getId() : "",
                "type", notification.getType().name(),
                "route", route,
                "showExpiredReservationModal",
                notification.getType() == Notification.NotificationType.EXPIRY_REACHED
        ));
        return payload;
    }

    private String titleFor(Notification notification) {
        return switch (notification.getType()) {
            case CHECK_IN_CONFIRMATION, RESERVATION_CONFIRMATION -> "Rezervimi u konfirmua";
            case SOFT_HOLD_EXPIRED -> "Mbajtja e vendit skadoi";
            case EXPIRY_WARNING -> "Koha po mbaron";
            case EXPIRY_REACHED -> "Rezervimi skadoi";
            case UNPAID_REMINDER -> "Pagesa po pret";
            case OTP -> "Kodi juaj";
        };
    }
}
