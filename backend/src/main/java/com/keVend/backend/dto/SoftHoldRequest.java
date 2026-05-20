package com.keVend.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SoftHoldRequest {

    @NotNull
    private Long parkingId;

    @NotNull
    @Min(1)
    private Integer spots;

    /** Driver-chosen session length in hours (FR-04 / F-05 timer basis). */
    @NotNull
    @Min(1)
    private Integer hours;

    /** Optional promo code applied at hold creation (FR-10). */
    private String promoCode;

    @NotBlank
    private String vehiclePlate;
}
