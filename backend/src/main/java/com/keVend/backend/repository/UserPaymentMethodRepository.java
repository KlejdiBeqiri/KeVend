package com.keVend.backend.repository;

import com.keVend.backend.model.UserPaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPaymentMethodRepository extends JpaRepository<UserPaymentMethod, Long> {
    List<UserPaymentMethod> findByUserIdOrderByPrimaryMethodDescCreatedAtAsc(Long userId);
    Optional<UserPaymentMethod> findByIdAndUserId(Long id, Long userId);
}
