package com.keVend.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_push_tokens", indexes = {
        @Index(name = "idx_push_token_token", columnList = "token", unique = true),
        @Index(name = "idx_push_token_user_active", columnList = "user_id,active")
})
@Data
public class UserPushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 255)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PushPlatform platform;

    @Column(nullable = false)
    private boolean active = true;

    private LocalDateTime lastSeenAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum PushPlatform {
        ANDROID,
        IOS
    }
}
