package com.keVend.backend.dto;

import com.keVend.backend.model.Parking;
import com.keVend.backend.model.ParkingPriceTier;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Data
@Builder
public class ParkingResponse {

    private Long id;
    private String name;
    private String zone;
    private Double latitude;
    private Double longitude;
    private Integer totalSpots;
    private Integer availableSpots;
    private BigDecimal pricePerHour;
    private Double maxVehicleHeightMeters;
    private Parking.Status status;
    private LocalDateTime openTime;
    private LocalDateTime closeTime;
    private Long ownerId;
    private List<ParkingPriceTierDto> priceTiers;
    private List<String> imageUrls;
    private Double distanceKm;

    public static ParkingResponse from(Parking parking) {
        return from(parking, null);
    }

    public static ParkingResponse from(Parking parking, Double distanceKm) {
        return ParkingResponse.builder()
                .id(parking.getId())
                .name(parking.getName())
                .zone(parking.getZone())
                .latitude(parking.getLatitude())
                .longitude(parking.getLongitude())
                .totalSpots(parking.getTotalSpots())
                .availableSpots(parking.getAvailableSpots())
                .pricePerHour(parking.getPricePerHour())
                .maxVehicleHeightMeters(parking.getMaxVehicleHeightMeters())
                .status(parking.getStatus())
                .openTime(parking.getOpenTime())
                .closeTime(parking.getCloseTime())
                .ownerId(parking.getOwner() != null ? parking.getOwner().getId() : null)
                .priceTiers(
                        parking.getPriceTiers().stream()
                                .sorted(Comparator.comparing(ParkingPriceTier::getDisplayOrder)
                                        .thenComparing(ParkingPriceTier::getFromHour))
                                .map(ParkingPriceTierDto::from)
                                .toList()
                )
                .imageUrls(List.copyOf(parking.getImageUrls()))
                .distanceKm(distanceKm)
                .build();
    }
}
