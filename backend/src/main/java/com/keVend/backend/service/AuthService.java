package com.keVend.backend.service;

import com.keVend.backend.audit.AuditLog;
import com.keVend.backend.dto.AuthResponse;
import com.keVend.backend.dto.LoginRequest;
import com.keVend.backend.dto.RegisterRequest;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.UserRepository;
import com.keVend.backend.security.JwtService;
import com.keVend.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    /** NFR-13: lock after N consecutive failures. */
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final AuditLog auditLog;
    private final I18n i18n;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw i18n.conflict("error.auth.email_in_use");
        }

        User user = new User();
        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole() != null ? request.getRole() : User.Role.DRIVER);
        user.setEmailVerified(false);

        userRepository.save(user);

        try {
            emailVerificationService.sendVerificationEmail(user);
        } catch (Exception e) {
            // Verification email failure is non-fatal — the user can request a resend.
        }

        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getRole().name(),
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getPhone()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                // Same generic message for both branches to avoid email enumeration
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        // NFR-13: refuse if currently locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw i18n.status(HttpStatus.LOCKED, "error.auth.account_locked");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException ex) {
            registerFailedAttempt(user);
            auditLog.loginFailure(request.getEmail());
            throw ex;
        }

        // OWNER role: must verify email first (FR-09 / NFR-13 sensitive earnings data)
        if (user.getRole() == User.Role.OWNER && !user.isEmailVerified()) {
            throw i18n.forbidden("error.auth.email_unverified");
        }

        // Reset lockout state on success
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = refreshTokenService.createRefreshToken(user);
        auditLog.loginSuccess(user.getId(), user.getEmail());

        return new AuthResponse(
                accessToken,
                refreshToken,
                user.getRole().name(),
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getPhone()
        );
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        User user = refreshTokenService.validateAndRotate(rawRefreshToken);

        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String newAccessToken = jwtService.generateAccessToken(userDetails);
        String newRefreshToken = refreshTokenService.createRefreshToken(user);

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                user.getRole().name(),
                user.getId(),
                user.getName(),
                user.getSurname(),
                user.getPhone()
        );
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> i18n.notFound("error.auth.user_not_found"));

        if (user.isEmailVerified()) {
            throw i18n.badRequest("error.auth.email_already_verified");
        }

        emailVerificationService.sendVerificationEmail(user);
    }

    private void registerFailedAttempt(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(Instant.now().plus(LOCK_DURATION_MINUTES, ChronoUnit.MINUTES));
            auditLog.accountLocked(user.getId());
        }
        userRepository.save(user);
    }
}
