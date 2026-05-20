package com.keVend.backend.dto;

import com.keVend.backend.model.UserPushToken;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PushTokenRequest {

    @NotBlank
    private String token;

    @NotNull
    private UserPushToken.PushPlatform platform;
}
