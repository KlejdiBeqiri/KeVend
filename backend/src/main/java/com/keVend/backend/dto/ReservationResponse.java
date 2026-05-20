package com.keVend.backend.dto;

import com.keVend.backend.model.Reservation;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class ReservationResponse {

    private Long id;
    private Long parkingId;
    private String parkingName;
    private Integer parkingAvailableSpots;
    private int spotsReserved;
    private Reservation.ReservationStatus status;
    private Instant holdExpiresAt;
    private Instant startTime;
    private Instant endTime;
    private String vehiclePlate;
    private BigDecimal totalCost;
    private BigDecimal platformCommission;
    private BigDecimal ownerRevenue;

    public static ReservationResponse from(Reservation r) {
        return ReservationResponse.builder()
                .id(r.getId())
                .parkingId(r.getParking() != null ? r.getParking().getId() : null)
                .parkingName(r.getParking() != null ? r.getParking().getName() : null)
                .parkingAvailableSpots(r.getParking() != null ? r.getParking().getAvailableSpots() : null)
                .spotsReserved(r.getSpotsReserved())
                .status(r.getStatus())
                .holdExpiresAt(r.getHoldExpiresAt())
                .startTime(r.getStartTime())
                .endTime(r.getEndTime())
                .vehiclePlate(r.getVehiclePlate())
                .totalCost(r.getTotalCost())
                .platformCommission(r.getPlatformCommission())
                .ownerRevenue(r.getOwnerRevenue())
                .build();
    }
}
