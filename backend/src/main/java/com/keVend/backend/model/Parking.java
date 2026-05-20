package com.keVend.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "parkings", indexes = {
        @Index(name = "idx_parkings_zone", columnList = "zone"),
        @Index(name = "idx_parkings_status", columnList = "status")
})
@Data
public class Parking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Free-text city zone/neighbourhood, e.g. "Blloku", "Qendra" (FR-14). */
    @Column(columnDefinition = "TEXT")
    private String zone;

    private Double latitude;

    private Double longitude;

    private Integer totalSpots;

    private Integer availableSpots;

    private BigDecimal pricePerHour;

    private Double maxVehicleHeightMeters;

    @OneToMany(mappedBy = "parking", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, fromHour ASC, toHour ASC")
    private List<ParkingPriceTier> priceTiers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "parking_images", joinColumns = @JoinColumn(name = "parking_id"))
    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    @OrderColumn(name = "display_order")
    private List<String> imageUrls = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Status status;

    /** Daily opening/closing — outside this window status is treated as CLOSED (FR-12). */
    private LocalDateTime openTime;

    private LocalDateTime closeTime;

    /** FR-12: owners pay extra to be ranked first. Higher = ranked higher. */
    @Column(name = "promotion_rank", nullable = false, columnDefinition = "integer default 0")
    private int promotionRank = 0;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status {
        OPEN, FULL, CLOSED
    }
}
