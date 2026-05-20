package com.keVend.backend.dto;

import com.keVend.backend.model.Payment;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {

    private Long id;
    private Long reservationId;
    private String parkingName;
    private String vehiclePlate;
    private Payment.PaymentMethod method;
    private Payment.PaymentProvider provider;
    private Payment.PaymentStatus status;
    private Payment.Currency currency;
    private BigDecimal amount;
    private BigDecimal platformCommission;
    private BigDecimal ownerEarnings;
    private String transactionReference;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .reservationId(p.getReservation() != null ? p.getReservation().getId() : null)
                .parkingName(p.getReservation() != null && p.getReservation().getParking() != null
                        ? p.getReservation().getParking().getName() : null)
                .vehiclePlate(p.getReservation() != null ? p.getReservation().getVehiclePlate() : null)
                .method(p.getMethod())
                .provider(p.getProvider())
                .status(p.getStatus())
                .currency(p.getCurrency())
                .amount(p.getAmount())
                .platformCommission(p.getPlatformCommission())
                .ownerEarnings(p.getOwnerEarnings())
                .transactionReference(p.getTransactionReference())
                .paidAt(p.getPaidAt())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
