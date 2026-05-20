package com.keVend.backend.service;

import com.keVend.backend.audit.AuditLog;
import com.keVend.backend.dto.ChangePasswordRequest;
import com.keVend.backend.dto.PushTokenRequest;
import com.keVend.backend.dto.UserPaymentMethodRequest;
import com.keVend.backend.dto.UserPaymentMethodResponse;
import com.keVend.backend.dto.UserVehicleRequest;
import com.keVend.backend.dto.UserVehicleResponse;
import com.keVend.backend.dto.UpdateProfileRequest;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Payment;
import com.keVend.backend.model.User;
import com.keVend.backend.model.UserPaymentMethod;
import com.keVend.backend.model.UserPushToken;
import com.keVend.backend.model.UserVehicle;
import com.keVend.backend.repository.EmailVerificationTokenRepository;
import com.keVend.backend.repository.RefreshTokenRepository;
import com.keVend.backend.repository.UserPaymentMethodRepository;
import com.keVend.backend.repository.UserPushTokenRepository;
import com.keVend.backend.repository.UserRepository;
import com.keVend.backend.repository.UserVehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserVehicleRepository userVehicleRepository;
    private final UserPaymentMethodRepository userPaymentMethodRepository;
    private final UserPushTokenRepository userPushTokenRepository;
    private final AuditLog auditLog;
    private final PasswordEncoder passwordEncoder;
    private final I18n i18n;

    public Map<String, Object> profile(User user) {
        var vehicles = normalizePrimaryVehicles(user.getId());
        var paymentMethods = normalizePrimaryPaymentMethods(user.getId());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", user.getId());
        body.put("name", user.getName());
        body.put("surname", user.getSurname());
        body.put("email", user.getEmail());
        body.put("phone", user.getPhone());
        body.put("role", user.getRole().name());
        body.put("emailVerified", user.isEmailVerified());
        body.put("preferredLocale", user.getPreferredLocale());
        body.put("vehicles", vehicles.stream().map(UserVehicleResponse::from).toList());
        body.put("paymentMethods", paymentMethods.stream().map(UserPaymentMethodResponse::from).toList());
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
        userPushTokenRepository.findByUserIdAndActiveTrue(user.getId())
                .forEach(token -> token.setActive(false));

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

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw i18n.badRequest("error.auth.current_password_invalid");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user);
    }

    @Transactional
    public UserVehicleResponse addVehicle(User user, UserVehicleRequest request) {
        if (request.isPrimaryVehicle()) {
            clearPrimaryVehicle(user.getId());
        }

        boolean hasVehicles = !normalizePrimaryVehicles(user.getId()).isEmpty();

        UserVehicle vehicle = new UserVehicle();
        vehicle.setUser(user);
        vehicle.setPlate(request.getPlate().trim().toUpperCase());
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setRegisteredOwner(request.getRegisteredOwner());
        vehicle.setPrimaryVehicle(request.isPrimaryVehicle() || !hasVehicles);
        return UserVehicleResponse.from(userVehicleRepository.save(vehicle));
    }

    @Transactional
    public void deleteVehicle(User user, Long vehicleId) {
        UserVehicle vehicle = userVehicleRepository.findByIdAndUserId(vehicleId, user.getId())
                .orElseThrow(() -> i18n.notFound("error.user.vehicle_not_found"));
        userVehicleRepository.delete(vehicle);
        normalizePrimaryVehicles(user.getId());
    }

    @Transactional
    public UserPaymentMethodResponse addPaymentMethod(User user, UserPaymentMethodRequest request) {
        if (request.getProvider() != Payment.PaymentProvider.PAYPAL) {
            throw i18n.badRequest("error.user.payment_method_provider_invalid");
        }

        if (request.isPrimaryMethod()) {
            clearPrimaryPaymentMethod(user.getId());
        }

        boolean hasMethods = !normalizePrimaryPaymentMethods(user.getId()).isEmpty();

        UserPaymentMethod method = new UserPaymentMethod();
        method.setUser(user);
        method.setProvider(request.getProvider());
        method.setAccountEmail(request.getAccountEmail().trim().toLowerCase());
        method.setDisplayLabel(request.getDisplayLabel());
        method.setPrimaryMethod(request.isPrimaryMethod() || !hasMethods);
        return UserPaymentMethodResponse.from(userPaymentMethodRepository.save(method));
    }

    @Transactional
    public void deletePaymentMethod(User user, Long methodId) {
        UserPaymentMethod method = userPaymentMethodRepository.findByIdAndUserId(methodId, user.getId())
                .orElseThrow(() -> i18n.notFound("error.user.payment_method_not_found"));
        userPaymentMethodRepository.delete(method);
        normalizePrimaryPaymentMethods(user.getId());
    }

    @Transactional
    public void registerPushToken(User user, PushTokenRequest request) {
        String tokenValue = request.getToken().trim();
        UserPushToken pushToken = userPushTokenRepository.findByToken(tokenValue)
                .orElseGet(UserPushToken::new);
        pushToken.setUser(user);
        pushToken.setToken(tokenValue);
        pushToken.setPlatform(request.getPlatform());
        pushToken.setActive(true);
        pushToken.setLastSeenAt(java.time.LocalDateTime.now());
        userPushTokenRepository.save(pushToken);
    }

    @Transactional
    public void removePushToken(User user, String token) {
        userPushTokenRepository.findByUserIdAndToken(user.getId(), token.trim())
                .ifPresent(pushToken -> {
                    pushToken.setActive(false);
                    pushToken.setLastSeenAt(java.time.LocalDateTime.now());
                    userPushTokenRepository.save(pushToken);
                });
    }

    private void clearPrimaryVehicle(Long userId) {
        userVehicleRepository.findByUserIdOrderByPrimaryVehicleDescCreatedAtAsc(userId)
                .forEach(vehicle -> vehicle.setPrimaryVehicle(false));
    }

    private void clearPrimaryPaymentMethod(Long userId) {
        userPaymentMethodRepository.findByUserIdOrderByPrimaryMethodDescCreatedAtAsc(userId)
                .forEach(method -> method.setPrimaryMethod(false));
    }

    private java.util.List<UserVehicle> normalizePrimaryVehicles(Long userId) {
        java.util.List<UserVehicle> vehicles =
                userVehicleRepository.findByUserIdOrderByPrimaryVehicleDescCreatedAtAsc(userId);
        boolean changed = false;
        boolean seenPrimary = false;

        for (UserVehicle vehicle : vehicles) {
            if (vehicle.isPrimaryVehicle() && !seenPrimary) {
                seenPrimary = true;
                continue;
            }

            if (vehicle.isPrimaryVehicle()) {
                vehicle.setPrimaryVehicle(false);
                changed = true;
            }
        }

        if (!seenPrimary && !vehicles.isEmpty()) {
            vehicles.get(0).setPrimaryVehicle(true);
            changed = true;
        }

        if (changed) {
            userVehicleRepository.saveAll(vehicles);
        }

        return vehicles;
    }

    private java.util.List<UserPaymentMethod> normalizePrimaryPaymentMethods(Long userId) {
        java.util.List<UserPaymentMethod> methods =
                userPaymentMethodRepository.findByUserIdOrderByPrimaryMethodDescCreatedAtAsc(userId);
        boolean changed = false;
        boolean seenPrimary = false;

        for (UserPaymentMethod method : methods) {
            if (method.isPrimaryMethod() && !seenPrimary) {
                seenPrimary = true;
                continue;
            }

            if (method.isPrimaryMethod()) {
                method.setPrimaryMethod(false);
                changed = true;
            }
        }

        if (!seenPrimary && !methods.isEmpty()) {
            methods.get(0).setPrimaryMethod(true);
            changed = true;
        }

        if (changed) {
            userPaymentMethodRepository.saveAll(methods);
        }

        return methods;
    }
}
