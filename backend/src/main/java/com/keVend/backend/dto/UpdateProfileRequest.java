package com.keVend.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotNull
    private String name;

    @NotNull
    private String surname;

    @NotNull
    private String phone;
}