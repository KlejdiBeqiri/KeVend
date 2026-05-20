package com.keVend.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    private DeliveryStatus deliveryStatus;

    private String message;

    private Integer attempts = 0;

    private LocalDateTime sentAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum NotificationType {
        CHECK_IN_CONFIRMATION,
        SOFT_HOLD_EXPIRED,
        EXPIRY_WARNING,
        EXPIRY_REACHED,
        UNPAID_REMINDER,
        OTP,
        RESERVATION_CONFIRMATION
    }

    public enum NotificationChannel {
        PUSH, SMS
    }

    public enum DeliveryStatus {
        PENDING, DELIVERED, FAILED
    }
}
