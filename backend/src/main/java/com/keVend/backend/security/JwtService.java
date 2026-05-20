package com.keVend.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${jwt.secret:${JWT_SECRET:}}")
    private String secretKey;

    // Access token: 15 minutes (short-lived, paired with refresh token)
    private static final long ACCESS_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

    @PostConstruct
    public void validateSecretKey() {
        if (secretKey == null || secretKey.getBytes().length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least 32 characters long. " +
                            "Current length: " + (secretKey == null ? 0 : secretKey.length())
            );
        }
    }

    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        if (userDetails instanceof UserDetailsImpl impl) {
            claims.put("role", impl.getUser().getRole().name());
            claims.put("userId", impl.getUser().getId());
        }
        return buildToken(claims, userDetails.getUsername(), ACCESS_TOKEN_EXPIRATION_MS);
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String email = extractEmail(token);
        return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private String buildToken(Map<String, Object> claims, String subject, long expirationMs) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }
}
