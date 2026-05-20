package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayPalOrderCreateRequest {

    @NotNull
    private Long reservationId;

    @NotBlank
    private String returnUrl;

    @NotBlank
    private String cancelUrl;

    @NotNull
    private Payment.Currency currency;

    private Long paymentMethodId;
}
