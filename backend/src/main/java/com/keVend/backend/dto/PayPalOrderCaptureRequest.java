package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayPalOrderCaptureRequest {

    @NotNull
    private Long reservationId;

    @NotBlank
    private String orderId;

    @NotNull
    private Payment.Currency currency;

    private Long paymentMethodId;
}
