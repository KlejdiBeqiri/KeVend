package com.keVend.backend.service;

import com.keVend.backend.audit.AuditLog;
import com.keVend.backend.dto.PaymentRequest;
import com.keVend.backend.dto.PaymentResponse;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Payment;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ReservationService reservationService;
    private final NotificationService notificationService;
    private final AuditLog auditLog;
    private final I18n i18n;

    /**
     * FR-05: records a paid reservation. We treat this as the upstream gateway
     * webhook outcome — the integration with Stripe/PayBY/Twilio is left to a
     * dedicated adapter; this method captures the *result*. On success it also
     * confirms the reservation so the downstream session timer (F-05) starts.
     */
    @Transactional
    public PaymentResponse pay(User driver, PaymentRequest req) {
        Reservation r = reservationService.loadOrThrow(req.getReservationId());

        if (!r.getDriver().getId().equals(driver.getId())) {
            throw i18n.forbidden("error.payment.not_your_reservation");
        }
        if (r.getStatus() != Reservation.ReservationStatus.SOFT_HOLD) {
            throw i18n.badRequest("error.payment.invalid_state");
        }
        paymentRepository.findByReservationId(r.getId()).ifPresent(p -> {
            if (p.getStatus() == Payment.PaymentStatus.COMPLETED) {
                throw i18n.conflict("error.payment.already_paid");
            }
        });

        Payment payment = new Payment();
        payment.setReservation(r);
        payment.setDriver(driver);
        payment.setMethod(req.getMethod());
        payment.setProvider(req.getProvider());
        payment.setCurrency(req.getCurrency());
        payment.setAmount(req.getAmount() != null ? req.getAmount() : r.getTotalCost());
        payment.setPlatformCommission(r.getPlatformCommission());
        payment.setOwnerEarnings(r.getOwnerRevenue());
        payment.setTransactionReference(req.getTransactionReference());
        payment.setStatus(Payment.PaymentStatus.COMPLETED);
        payment.setPaidAt(LocalDateTime.now());

        Payment saved = paymentRepository.save(payment);
        auditLog.payment(r.getId(), driver.getId(),
                req.getProvider().name(), req.getCurrency().name(), payment.getAmount());

        // Confirming flips the reservation to CONFIRMED and starts the session timer (F-05)
        reservationService.confirm(r.getId(), driver);

        // FR-04: post-check-in confirmation, rendered in the driver's preferred language
        String msg = notificationService.renderFor(driver,
                "notification.checkin.confirmation",
                r.getParking().getName(),
                r.getSpotsReserved(),
                r.getTotalCost(),
                req.getCurrency());
        notificationService.record(driver, r,
                com.keVend.backend.model.Notification.NotificationType.RESERVATION_CONFIRMATION,
                com.keVend.backend.model.Notification.NotificationChannel.PUSH, msg);

        return PaymentResponse.from(saved);
    }

    public PaymentResponse forReservation(Long reservationId, User caller) {
        Payment p = paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> i18n.notFound("error.payment.not_found"));
        if (!p.getDriver().getId().equals(caller.getId())) {
            throw i18n.forbidden("error.payment.not_yours");
        }
        return PaymentResponse.from(p);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> myPayments(User caller) {
        return paymentRepository.findByDriverIdOrderByPaidAtDescIdDesc(caller.getId())
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }
}
