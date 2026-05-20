package com.keVend.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserVehicleRequest {

    @NotBlank
    private String plate;

    private String vehicleType;

    private String registeredOwner;

    private boolean primaryVehicle;
}
