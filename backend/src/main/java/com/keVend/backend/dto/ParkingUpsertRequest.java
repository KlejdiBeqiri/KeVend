package com.keVend.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ParkingUpsertRequest {

    @NotBlank
    private String name;

    private String zone;

    @NotNull
    private Double latitude;

    @NotNull
    private Double longitude;

    @NotNull
    @Min(0)
    private Integer totalSpots;

    @NotNull
    @Min(0)
    private Integer availableSpots;

    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal pricePerHour;

    @DecimalMin(value = "0.0", inclusive = false)
    private Double maxVehicleHeightMeters;

    private List<ParkingPriceTierDto> priceTiers;

    private List<String> imageUrls;

    private LocalDateTime openTime;

    private LocalDateTime closeTime;

    @Min(0)
    private Integer promotionRank;

    @AssertTrue(message = "Either pricePerHour or priceTiers is required")
    public boolean isPricingPresent() {
        boolean hasFlatPrice = pricePerHour != null && pricePerHour.compareTo(BigDecimal.ZERO) > 0;
        boolean hasPriceTiers = priceTiers != null && !priceTiers.isEmpty();
        return hasFlatPrice || hasPriceTiers;
    }
}
