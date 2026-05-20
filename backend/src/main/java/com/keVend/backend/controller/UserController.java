package com.keVend.backend.controller;

import com.keVend.backend.dto.ChangePasswordRequest;
import com.keVend.backend.dto.UpdateProfileRequest;
import com.keVend.backend.dto.PushTokenRequest;
import com.keVend.backend.dto.UserPaymentMethodRequest;
import com.keVend.backend.dto.UserPaymentMethodResponse;
import com.keVend.backend.dto.UserVehicleRequest;
import com.keVend.backend.dto.UserVehicleResponse;
import com.keVend.backend.security.UserDetailsImpl;
import com.keVend.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(userService.profile(principal.getUser()));
    }

    /** NFR-12 GDPR: driver-initiated account deletion. */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal UserDetailsImpl principal) {
        userService.deleteAccount(principal.getUser());
        return ResponseEntity.noContent().build();
    }

    /** NFR-18: pick the language used for push/SMS notifications (e.g. "sq", "en"). */
    @PutMapping("/me/locale")
    public ResponseEntity<Void> setLocale(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam String locale
    ) {
        userService.setPreferredLocale(principal.getUser(), locale);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(principal.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me")
    public ResponseEntity<Void> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        userService.updateProfile(principal.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/vehicles")
    public ResponseEntity<UserVehicleResponse> addVehicle(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody UserVehicleRequest request
    ) {
        return ResponseEntity.ok(userService.addVehicle(principal.getUser(), request));
    }

    @DeleteMapping("/me/vehicles/{id}")
    public ResponseEntity<Void> deleteVehicle(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id
    ) {
        userService.deleteVehicle(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/payment-methods")
    public ResponseEntity<UserPaymentMethodResponse> addPaymentMethod(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody UserPaymentMethodRequest request
    ) {
        return ResponseEntity.ok(userService.addPaymentMethod(principal.getUser(), request));
    }

    @DeleteMapping("/me/payment-methods/{id}")
    public ResponseEntity<Void> deletePaymentMethod(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id
    ) {
        userService.deletePaymentMethod(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/push-tokens")
    public ResponseEntity<Void> registerPushToken(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @Valid @RequestBody PushTokenRequest request
    ) {
        userService.registerPushToken(principal.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me/push-tokens")
    public ResponseEntity<Void> removePushToken(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam String token
    ) {
        userService.removePushToken(principal.getUser(), token);
        return ResponseEntity.noContent().build();
    }
}
