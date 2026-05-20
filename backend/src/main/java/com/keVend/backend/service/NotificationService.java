package com.keVend.backend.service;

import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Notification;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.NotificationRepository;
import com.keVend.backend.repository.ReservationRepository;
import com.keVend.backend.sms.SmsDeliveryException;
import com.keVend.backend.sms.SmsGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Owns delivery of in-app/SMS notifications. Today this records each
 * notification in the DB and logs it; the actual push/SMS dispatch is left to
 * a dedicated transport adapter so the rest of the stack stays infra-agnostic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private static final long EXPIRY_NOTIFICATION_SWEEP_MS = 5_000;

    private final NotificationRepository notificationRepository;
    private final ReservationRepository reservationRepository;
    private final SmsGateway smsGateway;
    private final ExpoPushService expoPushService;
    private final I18n i18n;

    /** Render a notification message bundle key in the user's preferred language. */
    public String renderFor(User user, String key, Object... args) {
        return i18n.tFor(user.getPreferredLocale(), key, args);
    }

    @Transactional
    public Notification record(User user, Reservation reservation,
                               Notification.NotificationType type,
                               Notification.NotificationChannel channel,
                               String message) {
        Notification n = new Notification();
        n.setUser(user);
        n.setReservation(reservation);
        n.setType(type);
        n.setChannel(channel);
        n.setMessage(message);
        n.setSentAt(LocalDateTime.now());

        // SMS goes via the gateway; PUSH is recorded for the in-app inbox to read.
        // Failed SMS is persisted as FAILED so retries / inspection are possible.
        if (channel == Notification.NotificationChannel.SMS) {
            if (user.getPhone() == null || user.getPhone().isBlank()) {
                n.setDeliveryStatus(Notification.DeliveryStatus.FAILED);
            } else {
                try {
                    smsGateway.send(user.getPhone(), message);
                    n.setDeliveryStatus(Notification.DeliveryStatus.DELIVERED);
                } catch (SmsDeliveryException ex) {
                    log.warn("[notification] SMS failed user={} type={}: {}",
                            user.getId(), type, ex.getMessage());
                    n.setDeliveryStatus(Notification.DeliveryStatus.FAILED);
                }
            }
        } else {
            n.setDeliveryStatus(Notification.DeliveryStatus.PENDING);
        }

        Notification saved = notificationRepository.save(n);

        if (channel == Notification.NotificationChannel.PUSH) {
            boolean delivered = expoPushService.send(saved);
            saved.setDeliveryStatus(delivered
                    ? Notification.DeliveryStatus.DELIVERED
                    : Notification.DeliveryStatus.FAILED);
            saved = notificationRepository.save(saved);
        }

        log.info("[notification] type={} channel={} status={} user={} reservation={}",
                type, channel, saved.getDeliveryStatus(),
                user.getId(), reservation != null ? reservation.getId() : null);
        return saved;
    }

    public List<Notification> inboxFor(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public Notification sendTestPush(User user) {
        String message = "Ky eshte nje test notification nga KeVend. Nese po e sheh, push-i po funksionon.";
        return record(
                user,
                null,
                Notification.NotificationType.RESERVATION_CONFIRMATION,
                Notification.NotificationChannel.PUSH,
                message
        );
    }

    /**
     * Only dispatch the final "time expired" notification.
     */
    @Scheduled(fixedRate = EXPIRY_NOTIFICATION_SWEEP_MS)
    @Transactional
    public void dispatchExpiryNotifications() {
        Instant now = Instant.now();
        for (Reservation r : reservationRepository.findReachedExpiriesNeedingNotification(now)) {
            String msg = renderFor(r.getDriver(),
                    "notification.expiry.reached",
                    r.getParking().getName());
            record(r.getDriver(), r, Notification.NotificationType.EXPIRY_REACHED,
                    Notification.NotificationChannel.PUSH, msg);
            r.setExpiryReachedSent(true);
            reservationRepository.save(r);
        }
    }

}
