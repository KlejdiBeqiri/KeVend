package com.keVend.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayPalOrderResponse {
    private String orderId;
    private String status;
    private String approveUrl;
}
