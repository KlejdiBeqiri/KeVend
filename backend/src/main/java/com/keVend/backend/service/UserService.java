package com.keVend.backend.service;

import com.keVend.backend.audit.AuditLog;
import com.keVend.backend.dto.UpdateProfileRequest;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.EmailVerificationTokenRepository;
import com.keVend.backend.repository.RefreshTokenRepository;
import com.keVend.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String DELETED_EMAIL_DOMAIN = "@anon.kevend.local";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AuditLog auditLog;

    public Map<String, Object> profile(User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", user.getId());
        body.put("name", user.getName());
        body.put("surname", user.getSurname());
        body.put("email", user.getEmail());
        body.put("phone", user.getPhone());
        body.put("role", user.getRole().name());
        body.put("emailVerified", user.isEmailVerified());
        body.put("preferredLocale", user.getPreferredLocale());
        body.put("createdAt", user.getCreatedAt());
        return body;
    }

    @org.springframework.transaction.annotation.Transactional
    public void setPreferredLocale(User user, String localeTag) {
        user.setPreferredLocale(localeTag);
        userRepository.save(user);
    }

    /**
     * NFR-12 GDPR: anonymize the account instead of deleting. PII is cleared
     * and the email is rewritten to a deterministic placeholder so the unique
     * constraint still holds; reservations / payments / reviews keep their
     * historical FK references intact for owner accounting (NFR-22).
     *
     * The user can no longer log in: passwordHash is wiped and the original
     * email is gone, so {@code findByEmail} on it returns empty.
     */
    @Transactional
    public void deleteAccount(User user) {
        refreshTokenRepository.revokeAllByUser(user);
        emailVerificationTokenRepository.deleteByUser(user);

        user.setName(null);
        user.setSurname(null);
        user.setPhone(null);
        user.setEmail("deleted-" + user.getId() + DELETED_EMAIL_DOMAIN);
        user.setPasswordHash("");
        user.setEmailVerified(false);
        user.setAnonymized(true);
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
        auditLog.accountAnonymized(user.getId());
    }

    @Transactional
    public void updateProfile(User user, UpdateProfileRequest request) {
        if (request.getName() != null)    user.setName(request.getName());
        if (request.getSurname() != null) user.setSurname(request.getSurname());
        if (request.getPhone() != null)   user.setPhone(request.getPhone());
        userRepository.save(user);
    }
}
