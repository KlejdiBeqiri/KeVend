package com.keVend.backend.config;

import com.keVend.backend.model.Notification;
import com.keVend.backend.model.Payment;
import com.keVend.backend.model.Parking;
import com.keVend.backend.model.Reservation;
import com.keVend.backend.model.Review;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.NotificationRepository;
import com.keVend.backend.repository.PaymentRepository;
import com.keVend.backend.repository.ParkingRepository;
import com.keVend.backend.repository.ReservationRepository;
import com.keVend.backend.repository.ReviewRepository;
import com.keVend.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Comparator;

@Configuration
@Profile("local")
public class LocalDriverActivitySeedConfig {

    @Bean
    CommandLineRunner seedLocalDriverActivity(
            UserRepository userRepository,
            ParkingRepository parkingRepository,
            ReservationRepository reservationRepository,
            PaymentRepository paymentRepository,
            NotificationRepository notificationRepository,
            ReviewRepository reviewRepository
    ) {
        return args -> {
            Parking parking = parkingRepository.findAll().stream()
                    .sorted(Comparator.comparing(Parking::getId))
                    .findFirst()
                    .orElse(null);

            if (parking == null) {
                return;
            }

            for (User driver : userRepository.findAll().stream()
                    .filter(user -> user.getRole() == User.Role.DRIVER)
                    .toList()) {
                if (!paymentRepository.findByDriverId(driver.getId()).isEmpty()) {
                    continue;
                }

                java.util.List<Parking> seedParkings = parkingRepository.findAll().stream()
                        .sorted(Comparator.comparing(Parking::getId))
                        .limit(3)
                        .toList();

                for (int index = 0; index < 6; index++) {
                    Parking historyParking = seedParkings.get(index % seedParkings.size());
                    Reservation reservation = new Reservation();
                    reservation.setDriver(driver);
                    reservation.setParking(historyParking);
                    reservation.setSpotsReserved(index % 3 == 2 ? 2 : 1);
                    reservation.setStatus(Reservation.ReservationStatus.COMPLETED);
                    reservation.setHoldExpiresAt(Instant.now().minusSeconds(7200L * (index + 1)));
                    reservation.setStartTime(Instant.now().minusSeconds(10800L * (index + 2)));
                    reservation.setEndTime(Instant.now().minusSeconds(7200L * (index + 1)));
                    reservation.setVehiclePlate(
                            index % 3 == 0 ? "AB 123 JK" :
                                    index % 3 == 1 ? "AA 555 ZZ" : "TR 908 EV"
                    );
                    BigDecimal total = index % 3 == 0
                            ? new BigDecimal("280.00")
                            : index % 3 == 1 ? new BigDecimal("150.00") : new BigDecimal("360.00");
                    BigDecimal commission = index % 3 == 0
                            ? new BigDecimal("42.00")
                            : index % 3 == 1 ? new BigDecimal("22.50") : new BigDecimal("54.00");
                    reservation.setTotalCost(total);
                    reservation.setPlatformCommission(commission);
                    reservation.setOwnerRevenue(total.subtract(commission));
                    reservation.setExpiryReachedSent(true);
                    reservation.setExpiryWarningSent(true);
                    Reservation savedReservation = reservationRepository.save(reservation);

                    Payment payment = new Payment();
                    payment.setReservation(savedReservation);
                    payment.setDriver(driver);
                    payment.setMethod(Payment.PaymentMethod.DIGITAL_WALLET);
                    payment.setProvider(Payment.PaymentProvider.PAYPAL);
                    payment.setStatus(Payment.PaymentStatus.COMPLETED);
                    payment.setCurrency(index % 3 == 1 ? Payment.Currency.ALL : Payment.Currency.EUR);
                    payment.setAmount(index % 3 == 1 ? new BigDecimal("150.00") : index % 3 == 0
                            ? new BigDecimal("2.93") : new BigDecimal("3.77"));
                    payment.setPlatformCommission(savedReservation.getPlatformCommission());
                    payment.setOwnerEarnings(savedReservation.getOwnerRevenue());
                    payment.setTransactionReference("local-seed-" + driver.getId() + "-" + savedReservation.getId());
                    payment.setPaidAt(LocalDateTime.now().minusDays(index + 1).minusHours(index * 2L));
                    paymentRepository.save(payment);

                    Notification confirmation = new Notification();
                    confirmation.setUser(driver);
                    confirmation.setReservation(savedReservation);
                    confirmation.setType(Notification.NotificationType.CHECK_IN_CONFIRMATION);
                    confirmation.setChannel(Notification.NotificationChannel.PUSH);
                    confirmation.setDeliveryStatus(Notification.DeliveryStatus.DELIVERED);
                    confirmation.setMessage("Rezervimi juaj te " + historyParking.getName() + " u konfirmua.");
                    confirmation.setSentAt(LocalDateTime.now().minusDays(index + 1));
                    notificationRepository.save(confirmation);

                    Notification followUp = new Notification();
                    followUp.setUser(driver);
                    followUp.setReservation(savedReservation);
                    followUp.setType(index == 2
                            ? Notification.NotificationType.RESERVATION_CONFIRMATION
                            : Notification.NotificationType.EXPIRY_REACHED);
                    followUp.setChannel(Notification.NotificationChannel.PUSH);
                    followUp.setDeliveryStatus(Notification.DeliveryStatus.DELIVERED);
                    followUp.setMessage(index % 3 == 2
                            ? "Rezervimi juaj te " + historyParking.getName() + " eshte gati per hyrje."
                            : "Sesioni juaj te " + historyParking.getName() + " ka perfunduar.");
                    followUp.setSentAt(LocalDateTime.now().minusDays(index + 1).plusHours(2));
                    notificationRepository.save(followUp);

                    if (!reviewRepository.existsByReservationId(savedReservation.getId())) {
                        Review review = new Review();
                        review.setDriver(driver);
                        review.setParking(historyParking);
                        review.setReservation(savedReservation);
                        review.setRating(index % 3 == 0 ? 5 : index % 3 == 1 ? 4 : 3);
                        review.setComment(index % 3 == 0
                                ? "Vend i rregullt, hyrje e shpejte dhe proces i lehte."
                                : index % 3 == 1
                                ? "Parkim i mire dhe afersi e mire me destinacionin."
                                : "Eksperience ne rregull, por ne oret e pikut ka pak levizje.");
                        reviewRepository.save(review);
                    }
                }
            }
        };
    }
}
