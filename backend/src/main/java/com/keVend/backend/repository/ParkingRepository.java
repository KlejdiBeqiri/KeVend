package com.keVend.backend.repository;

import com.keVend.backend.model.Parking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingRepository extends JpaRepository<Parking, Long> {

    List<Parking> findByStatus(Parking.Status status);

    @EntityGraph(attributePaths = {"priceTiers", "imageUrls"})
    List<Parking> findByOwnerId(Long ownerId);

    @EntityGraph(attributePaths = {"priceTiers", "imageUrls"})
    Optional<Parking> findWithPriceTiersById(Long id);

    @EntityGraph(attributePaths = {"priceTiers", "imageUrls"})
    Optional<Parking> findWithPriceTiersByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    /**
     * Predicate-driven search backing the public lot list (F-09, FR-14).
     * All non-zone filters are nullable and skipped when null.
     */
    @EntityGraph(attributePaths = {"priceTiers", "imageUrls"})
    @Query("""
            SELECT p FROM Parking p
            WHERE (:zone IS NULL OR p.zone = :zone)
              AND (:minPrice IS NULL OR p.pricePerHour >= :minPrice)
              AND (:maxPrice IS NULL OR p.pricePerHour <= :maxPrice)
              AND (:availableOnly = false OR p.status = com.keVend.backend.model.Parking.Status.OPEN)
            ORDER BY p.promotionRank DESC, p.id ASC
            """)
    List<Parking> search(
            @Param("zone") String zone,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("availableOnly") boolean availableOnly
    );
}
