package com.keVend.backend.dto;

import com.keVend.backend.model.Notification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {

    private Long id;
    private Long reservationId;
    private String message;
    private Notification.NotificationType type;
    private Notification.NotificationChannel channel;
    private Notification.DeliveryStatus deliveryStatus;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .reservationId(notification.getReservation() != null ? notification.getReservation().getId() : null)
                .message(notification.getMessage())
                .type(notification.getType())
                .channel(notification.getChannel())
                .deliveryStatus(notification.getDeliveryStatus())
                .sentAt(notification.getSentAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
