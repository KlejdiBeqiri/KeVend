package com.keVend.backend.repository;

import com.keVend.backend.model.UserVehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserVehicleRepository extends JpaRepository<UserVehicle, Long> {
    List<UserVehicle> findByUserIdOrderByPrimaryVehicleDescCreatedAtAsc(Long userId);
    Optional<UserVehicle> findByIdAndUserId(Long id, Long userId);
}
