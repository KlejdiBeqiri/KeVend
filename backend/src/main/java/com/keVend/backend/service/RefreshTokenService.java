package com.keVend.backend.service;

import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.RefreshToken;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.RefreshTokenRepository;
import com.keVend.backend.security.TokenHashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final long REFRESH_TOKEN_EXPIRATION_DAYS = 30;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final I18n i18n;

    /**
     * Creates a new refresh token for the user.
     * Revokes all existing tokens for that user first (rotation strategy).
     *
     * @return the raw token to send to the client (never stored as-is)
     */
    @Transactional
    public String createRefreshToken(User user) {
        // Revoke all existing tokens — one active refresh token per user
        refreshTokenRepository.revokeAllByUser(user);

        String rawToken = generateRawToken();

        RefreshToken token = new RefreshToken();
        token.setTokenHash(TokenHashUtil.hash(rawToken));
        token.setUser(user);
        token.setExpiresAt(Instant.now().plusSeconds(REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 3600));
        token.setRevoked(false);

        refreshTokenRepository.save(token);
        return rawToken;
    }

    /**
     * Validates the raw refresh token and returns the associated User.
     * Revokes the token immediately after validation (one-time use / rotation).
     */
    @Transactional
    public User validateAndRotate(String rawToken) {
        String hash = TokenHashUtil.hash(rawToken);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> i18n.status(HttpStatus.UNAUTHORIZED, "error.refresh_token.invalid"));

        if (stored.isRevoked()) {
            // Possible token reuse — revoke ALL tokens for this user as a safety measure
            refreshTokenRepository.revokeAllByUser(stored.getUser());
            throw i18n.status(HttpStatus.UNAUTHORIZED, "error.refresh_token.reuse");
        }

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw i18n.status(HttpStatus.UNAUTHORIZED, "error.refresh_token.expired");
        }

        // Revoke this token — a new one will be issued
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return stored.getUser();
    }

    @Transactional
    public void revokeAllTokens(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[48]; // 384 bits
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
