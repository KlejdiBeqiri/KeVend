package com.keVend.backend.repository;

import com.keVend.backend.model.Reservation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
            SELECT r FROM Reservation r
            LEFT JOIN FETCH r.parking p
            WHERE r.driver.id = :driverId
            ORDER BY r.id DESC
            """)
    List<Reservation> findHistoryForDriver(
            @Param("driverId") Long driverId,
            Pageable pageable);

    @Query("""
            SELECT r FROM Reservation r
            LEFT JOIN FETCH r.parking p
            WHERE r.driver.id = :driverId
              AND (
                  (
                      r.status = com.keVend.backend.model.Reservation.ReservationStatus.SOFT_HOLD
                      AND r.holdExpiresAt > :now
                  )
                  OR (
                      r.status = com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED
                      AND r.endTime > :now
                  )
                  OR (
                      r.status = com.keVend.backend.model.Reservation.ReservationStatus.COMPLETED
                      AND r.endTime > :now
                  )
              )
            ORDER BY r.id DESC
            """)
    List<Reservation> findCurrentForDriver(
            @Param("driverId") Long driverId,
            @Param("now") Instant now,
            Pageable pageable);

    List<Reservation> findByParkingId(Long parkingId);

    List<Reservation> findByStatusAndHoldExpiresAtBefore(
            Reservation.ReservationStatus status, Instant cutoff);

    /** FR-19 / F-04: enforces "one fee per parking" — checks for an existing active reservation. */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.driver.id = :driverId
              AND r.parking.id = :parkingId
              AND r.status IN (
                  com.keVend.backend.model.Reservation.ReservationStatus.SOFT_HOLD,
                  com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED
              )
            """)
    List<Reservation> findActiveAtParkingForDriver(
            @Param("driverId") Long driverId,
            @Param("parkingId") Long parkingId);

    @Query("""
            SELECT r FROM Reservation r
            WHERE r.driver.id = :driverId
              AND (
                  (
                      r.status = com.keVend.backend.model.Reservation.ReservationStatus.SOFT_HOLD
                      AND r.holdExpiresAt > :now
                  )
                  OR (
                      r.status = com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED
                      AND r.endTime > :now
                  )
              )
            ORDER BY r.id DESC
            """)
    List<Reservation> findActiveForDriver(
            @Param("driverId") Long driverId,
            @Param("now") Instant now,
            Pageable pageable);

    /** FR-13: owner sees daily session list. */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.parking.owner.id = :ownerId
              AND r.startTime >= :from
              AND r.startTime < :to
              AND r.status IN (
                  com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED,
                  com.keVend.backend.model.Reservation.ReservationStatus.COMPLETED
              )
            ORDER BY r.startTime DESC
            """)
    List<Reservation> findOwnerSessionsBetween(
            @Param("ownerId") Long ownerId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /** FR-07: confirmed reservations whose end-time falls inside a warning window. */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.status = com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED
              AND r.expiryWarningSent = false
              AND r.endTime BETWEEN :now AND :until
            """)
    List<Reservation> findUpcomingExpiries(
            @Param("now") Instant now,
            @Param("until") Instant until);

    /** Background sweep: confirmed reservations whose session end-time has passed. */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.status = com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED
              AND r.endTime <= :now
            """)
    List<Reservation> findExpiredConfirmed(@Param("now") Instant now);

    /**
     * FR-07 part 2: confirmed reservations whose end-time has just passed and
     * still need the "expiry reached" notification.
     */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.status IN (
                  com.keVend.backend.model.Reservation.ReservationStatus.CONFIRMED,
                  com.keVend.backend.model.Reservation.ReservationStatus.COMPLETED
              )
              AND r.expiryReachedSent = false
              AND r.endTime <= :now
            """)
    List<Reservation> findReachedExpiriesNeedingNotification(@Param("now") Instant now);
}
