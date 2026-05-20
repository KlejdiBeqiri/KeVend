package com.keVend.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_vehicles")
@Data
public class UserVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 32)
    private String plate;

    private String vehicleType;

    private String registeredOwner;

    @Column(nullable = false)
    private boolean primaryVehicle = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
