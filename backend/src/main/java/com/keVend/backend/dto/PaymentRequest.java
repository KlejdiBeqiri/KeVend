package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {

    @NotNull
    private Long reservationId;

    @NotNull
    private Payment.PaymentMethod method;

    @NotNull
    private Payment.PaymentProvider provider;

    @NotNull
    private Payment.Currency currency;

    /** Optional settled amount in the payment currency when a gateway converted from the local price. */
    private BigDecimal amount;

    /** Optional reference returned by the upstream gateway/SMS provider. */
    private String transactionReference;
}
