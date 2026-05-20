package com.keVend.backend.controller;

import com.keVend.backend.dto.NotificationResponse;
import com.keVend.backend.security.UserDetailsImpl;
import com.keVend.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> myInbox(
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(
                notificationService.inboxFor(principal.getUser().getId())
                        .stream()
                        .map(NotificationResponse::from)
                        .toList()
        );
    }

    @PostMapping("/test-push")
    public ResponseEntity<NotificationResponse> testPush(
            @AuthenticationPrincipal UserDetailsImpl principal
    ) {
        return ResponseEntity.ok(
                NotificationResponse.from(notificationService.sendTestPush(principal.getUser()))
        );
    }
}
