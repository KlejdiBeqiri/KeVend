package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserPaymentMethodRequest {

    @NotNull
    private Payment.PaymentProvider provider;

    @Email
    @NotNull
    private String accountEmail;

    private String displayLabel;

    private boolean primaryMethod;
}
