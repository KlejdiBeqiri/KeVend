package com.keVend.backend.dto;

import com.keVend.backend.model.UserVehicle;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserVehicleResponse {

    private Long id;
    private String plate;
    private String vehicleType;
    private String registeredOwner;
    private boolean primaryVehicle;

    public static UserVehicleResponse from(UserVehicle vehicle) {
        return UserVehicleResponse.builder()
                .id(vehicle.getId())
                .plate(vehicle.getPlate())
                .vehicleType(vehicle.getVehicleType())
                .registeredOwner(vehicle.getRegisteredOwner())
                .primaryVehicle(vehicle.isPrimaryVehicle())
                .build();
    }
}
