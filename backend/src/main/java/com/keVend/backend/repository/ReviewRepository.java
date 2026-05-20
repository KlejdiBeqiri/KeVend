package com.keVend.backend.repository;

import com.keVend.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByReservationId(Long reservationId);

    List<Review> findByParkingIdOrderByCreatedAtDesc(Long parkingId);

    long countByParkingId(Long parkingId);
}
