package com.keVend.backend.repository;

import com.keVend.backend.model.UserPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

    Optional<UserPushToken> findByToken(String token);

    List<UserPushToken> findByUserIdAndActiveTrue(Long userId);

    Optional<UserPushToken> findByUserIdAndToken(Long userId, String token);
}
