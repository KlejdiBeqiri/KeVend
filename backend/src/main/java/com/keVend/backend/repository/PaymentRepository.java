package com.keVend.backend.repository;

import com.keVend.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("""
            SELECT p FROM Payment p
            LEFT JOIN FETCH p.reservation r
            LEFT JOIN FETCH r.parking
            WHERE p.reservation.id = :reservationId
            """)
    Optional<Payment> findByReservationId(@Param("reservationId") Long reservationId);

    List<Payment> findByDriverId(Long driverId);

    @Query("""
            SELECT p FROM Payment p
            LEFT JOIN FETCH p.reservation r
            LEFT JOIN FETCH r.parking
            WHERE p.driver.id = :driverId
            ORDER BY p.paidAt DESC, p.id DESC
            """)
    List<Payment> findByDriverIdOrderByPaidAtDescIdDesc(@Param("driverId") Long driverId);

    /** Drives FR-17 owner revenue chart for a date range. */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.reservation.parking.owner.id = :ownerId
              AND p.status = com.keVend.backend.model.Payment.PaymentStatus.COMPLETED
              AND p.paidAt BETWEEN :from AND :to
            ORDER BY p.paidAt ASC
            """)
    List<Payment> findCompletedForOwnerBetween(
            @Param("ownerId") Long ownerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
