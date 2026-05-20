package com.keVend.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_payment_methods")
@Data
public class UserPaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Payment.PaymentProvider provider;

    @Column(nullable = false)
    private String accountEmail;

    private String displayLabel;

    @Column(nullable = false)
    private boolean primaryMethod = false;

    private String externalReference;

    private LocalDateTime createdAt = LocalDateTime.now();
}
