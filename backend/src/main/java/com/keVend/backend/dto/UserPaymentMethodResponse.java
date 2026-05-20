package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import com.keVend.backend.model.UserPaymentMethod;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserPaymentMethodResponse {

    private Long id;
    private Payment.PaymentProvider provider;
    private String accountEmail;
    private String displayLabel;
    private boolean primaryMethod;

    public static UserPaymentMethodResponse from(UserPaymentMethod method) {
        return UserPaymentMethodResponse.builder()
                .id(method.getId())
                .provider(method.getProvider())
                .accountEmail(method.getAccountEmail())
                .displayLabel(method.getDisplayLabel())
                .primaryMethod(method.isPrimaryMethod())
                .build();
    }
}
