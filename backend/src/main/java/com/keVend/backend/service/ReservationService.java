package com.keVend.backend.service;

import com.keVend.backend.dto.ReservationResponse;
import com.keVend.backend.dto.SoftHoldRequest;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Parking;
import com.keVend.backend.model.ParkingPriceTier;
import com.keVend.backend.model.Promotion;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.ParkingRepository;
import com.keVend.backend.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private static final long RESERVATION_SWEEP_MS = 5_000;
    private static final int SOFT_HOLD_MINUTES = 10;      // F-02
    private static final int RESERVATION_DURATION_MINUTES = 10;
    private static final int MAX_SPOTS_PER_DRIVER = 5;    // FR-19 / F-12 cap per parking
    private static final BigDecimal RESERVATION_FEE = new BigDecimal("50.00");

    private final ReservationRepository reservationRepository;
    private final ParkingRepository parkingRepository;
    private final PromotionService promotionService;
    private final NotificationService notificationService;
    private final I18n i18n;

    /**
     * F-02: 5-minute soft hold. Decrements available spots immediately so the
     * place is reserved while the driver navigates. Cost is computed up-front
     * so the payment step uses the locked-in price.
     */
    @Transactional
    public ReservationResponse createSoftHold(User driver, SoftHoldRequest req) {
        if (req.getSpots() > MAX_SPOTS_PER_DRIVER) {
            throw i18n.badRequest("error.reservation.spots_too_many", MAX_SPOTS_PER_DRIVER);
        }

        Parking parking = parkingRepository.findById(req.getParkingId())
                .orElseThrow(() -> i18n.notFound("error.parking.not_found"));

        if (parking.getStatus() != Parking.Status.OPEN || parking.getAvailableSpots() < req.getSpots()) {
            throw i18n.conflict("error.reservation.not_enough_spots");
        }

        // One active reservation total per driver across all parkings.
        List<Reservation> existing = reservationRepository
                .findActiveForDriver(driver.getId(), Instant.now(), PageRequest.of(0, 1));
        if (!existing.isEmpty()) {
            throw i18n.conflict("error.reservation.duplicate_at_parking");
        }

        parking.setAvailableSpots(parking.getAvailableSpots() - req.getSpots());
        if (parking.getAvailableSpots() == 0) {
            parking.setStatus(Parking.Status.FULL);
        }
        parkingRepository.save(parking);

        BigDecimal parkingSubtotal = resolveReservationPrice(parking, 1)
                .multiply(BigDecimal.valueOf(req.getSpots()))
                .setScale(2, RoundingMode.HALF_UP);

        // FR-10: optional promo applied at hold time. Per-user limits are
        // enforced again at confirm time so we can pre-validate here without
        // committing the redemption.
        Promotion promo = promotionService.resolve(req.getPromoCode())
                .filter(p -> promotionService.canDriverRedeem(p, driver))
                .orElse(null);
        BigDecimal discountedSubtotal = promotionService.apply(parkingSubtotal, promo)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCost = RESERVATION_FEE.setScale(2, RoundingMode.HALF_UP);

        Instant now = Instant.now();
        Reservation r = new Reservation();
        r.setDriver(driver);
        r.setParking(parking);
        r.setSpotsReserved(req.getSpots());
        r.setStatus(Reservation.ReservationStatus.SOFT_HOLD);
        r.setHoldExpiresAt(now.plus(SOFT_HOLD_MINUTES, ChronoUnit.MINUTES));
        // Provisional times — finalised on confirm
        r.setStartTime(now);
        r.setEndTime(now.plus(RESERVATION_DURATION_MINUTES, ChronoUnit.MINUTES));
        r.setVehiclePlate(req.getVehiclePlate().trim().toUpperCase());
        r.setTotalCost(totalCost);
        r.setPlatformCommission(RESERVATION_FEE);
        r.setOwnerRevenue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        Reservation saved = reservationRepository.save(r);
        if (promo != null) {
            promotionService.recordRedemption(
                    promo,
                    driver,
                    saved,
                    parkingSubtotal.subtract(discountedSubtotal)
            );
        }
        return ReservationResponse.from(saved);
    }

    /**
     * Confirms a held reservation — called after a successful payment. Sets the
     * real start time and an endTime offset by the hold's session length.
     */
    @Transactional
    public ReservationResponse confirm(Long reservationId, User driver) {
        Reservation r = ownedByOrThrow(reservationId, driver);

        if (r.getStatus() != Reservation.ReservationStatus.SOFT_HOLD) {
            throw i18n.badRequest("error.reservation.not_in_hold_state");
        }
        if (Instant.now().isAfter(r.getHoldExpiresAt())) {
            throw i18n.status(HttpStatus.GONE, "error.reservation.hold_expired");
        }

        Instant now = Instant.now();
        r.setStartTime(now);
        r.setEndTime(now.plus(RESERVATION_DURATION_MINUTES, ChronoUnit.MINUTES));
        r.setHoldExpiresAt(now.plus(SOFT_HOLD_MINUTES, ChronoUnit.MINUTES));
        r.setStatus(Reservation.ReservationStatus.CONFIRMED);
        r.setExpiryWarningSent(false);
        r.setExpiryReachedSent(false);

        return ReservationResponse.from(reservationRepository.save(r));
    }

    /**
     * Local/dev-only convenience path for UI testing: confirms a soft hold
     * without running the external PayPal flow.
     */
    @Transactional
    public ReservationResponse confirmForTesting(Long reservationId, User driver) {
        ReservationResponse response = confirm(reservationId, driver);
        Reservation confirmed = loadOrThrow(reservationId);

        String msg = notificationService.renderFor(driver,
                "notification.checkin.confirmation",
                confirmed.getParking().getName(),
                confirmed.getSpotsReserved(),
                confirmed.getTotalCost(),
                "ALL");
        notificationService.record(driver, confirmed,
                com.keVend.backend.model.Notification.NotificationType.RESERVATION_CONFIRMATION,
                com.keVend.backend.model.Notification.NotificationChannel.PUSH, msg);

        return response;
    }

    @Transactional
    public ReservationResponse cancel(Long reservationId, User driver) {
        Reservation r = ownedByOrThrow(reservationId, driver);

        if (r.getStatus() == Reservation.ReservationStatus.COMPLETED
                || r.getStatus() == Reservation.ReservationStatus.CANCELLED
                || r.getStatus() == Reservation.ReservationStatus.EXPIRED) {
            throw i18n.conflict("error.reservation.not_cancellable");
        }

        releaseSpots(r);
        r.setStatus(Reservation.ReservationStatus.CANCELLED);
        return ReservationResponse.from(reservationRepository.save(r));
    }

    /** FR-10: returns the driver's last 10 sessions, newest first. */
    @Transactional(readOnly = true)
    public List<ReservationResponse> historyForDriver(Long driverId) {
        return reservationRepository
                .findHistoryForDriver(driverId, PageRequest.of(0, 10))
                .stream().map(ReservationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse currentForDriver(Long driverId) {
        return reservationRepository.findCurrentForDriver(driverId, Instant.now(), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(ReservationResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public ReservationResponse get(Long id, User caller) {
        Reservation r = ownedByOrThrow(id, caller);
        return ReservationResponse.from(r);
    }

    /** Background sweep — clears expired soft-holds (F-02). */
    @Scheduled(fixedRate = RESERVATION_SWEEP_MS)
    @Transactional
    public void releaseExpiredHolds() {
        List<Reservation> expired = reservationRepository.findByStatusAndHoldExpiresAtBefore(
                Reservation.ReservationStatus.SOFT_HOLD, Instant.now()
        );
        for (Reservation r : expired) {
            releaseSpots(r);
            r.setStatus(Reservation.ReservationStatus.EXPIRED);
            reservationRepository.save(r);
        }
    }

    /** Background sweep — marks confirmed reservations as completed once endTime passes. */
    @Scheduled(fixedRate = RESERVATION_SWEEP_MS)
    @Transactional
    public void completeExpiredSessions() {
        for (Reservation r : reservationRepository.findExpiredConfirmed(Instant.now())) {
            releaseSpots(r);
            r.setStatus(Reservation.ReservationStatus.COMPLETED);
            reservationRepository.save(r);
        }
    }

    public Reservation loadOrThrow(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> i18n.notFound("error.reservation.not_found"));
    }

    private Reservation ownedByOrThrow(Long id, User caller) {
        Reservation r = loadOrThrow(id);
        if (!r.getDriver().getId().equals(caller.getId())) {
            throw i18n.forbidden("error.reservation.not_yours");
        }
        return r;
    }

    private void releaseSpots(Reservation r) {
        Parking parking = r.getParking();
        parking.setAvailableSpots(parking.getAvailableSpots() + r.getSpotsReserved());
        if (parking.getStatus() == Parking.Status.FULL && parking.getAvailableSpots() > 0) {
            parking.setStatus(Parking.Status.OPEN);
        }
        parkingRepository.save(parking);
    }

    private BigDecimal resolveReservationPrice(Parking parking, int hours) {
        List<ParkingPriceTier> tiers = parking.getPriceTiers();
        if (tiers == null || tiers.isEmpty()) {
            return parking.getPricePerHour().multiply(BigDecimal.valueOf(hours));
        }

        Optional<ParkingPriceTier> matchingTier = tiers.stream()
                .sorted(java.util.Comparator.comparing(ParkingPriceTier::getDisplayOrder))
                .filter(tier -> hours > tier.getFromHour() && hours <= tier.getToHour())
                .findFirst();

        if (matchingTier.isPresent()) {
            return matchingTier.get().getPrice();
        }

        ParkingPriceTier lastTier = tiers.stream()
                .sorted(java.util.Comparator.comparing(ParkingPriceTier::getDisplayOrder).reversed())
                .findFirst()
                .orElse(null);
        if (lastTier != null && hours > lastTier.getToHour()) {
            return lastTier.getPrice();
        }

        return parking.getPricePerHour().multiply(BigDecimal.valueOf(hours));
    }
}
