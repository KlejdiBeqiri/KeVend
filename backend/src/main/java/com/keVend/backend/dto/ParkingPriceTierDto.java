package com.keVend.backend.dto;

import com.keVend.backend.model.ParkingPriceTier;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ParkingPriceTierDto {

    @Min(0)
    @NotNull
    private Integer fromHour;

    @Min(1)
    @NotNull
    private Integer toHour;

    @DecimalMin(value = "0.0", inclusive = false)
    @NotNull
    private BigDecimal price;

    public static ParkingPriceTierDto from(ParkingPriceTier tier) {
        ParkingPriceTierDto dto = new ParkingPriceTierDto();
        dto.setFromHour(tier.getFromHour());
        dto.setToHour(tier.getToHour());
        dto.setPrice(tier.getPrice());
        return dto;
    }
}
