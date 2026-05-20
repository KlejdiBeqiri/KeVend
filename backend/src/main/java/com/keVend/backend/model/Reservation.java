package com.keVend.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_id", nullable = false)
    private Parking parking;

    private int spotsReserved;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status;

    private Instant holdExpiresAt; // For the 5-minute soft hold (F-02)
    private Instant startTime;
    private Instant endTime;

    private String vehiclePlate;

    /** FR-07: marker so the 10-minute warning is sent once and only once. */
    @Column(nullable = false)
    private boolean expiryWarningSent = false;

    /** FR-07 part 2: marker so the at-expiry notification is sent once and only once. */
    @Column(nullable = false)
    private boolean expiryReachedSent = false;

    private BigDecimal totalCost;
    private BigDecimal platformCommission;
    private BigDecimal ownerRevenue;

    public enum ReservationStatus {
        SOFT_HOLD,
        CONFIRMED,
        COMPLETED,
        EXPIRED,
        CANCELLED
    }
}
