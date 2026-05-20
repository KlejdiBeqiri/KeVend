package com.keVend.backend.service;

import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.EmailVerificationToken;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.EmailVerificationTokenRepository;
import com.keVend.backend.repository.UserRepository;
import com.keVend.backend.security.TokenHashUtil;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final long TOKEN_EXPIRATION_HOURS = 24;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final I18n i18n;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Sends a verification email to the user.
     * Any existing token for that user is deleted first.
     */
    @Transactional
    private void saveToken(User user, String rawToken) {
        tokenRepository.deleteByUser(user);
        tokenRepository.flush();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setTokenHash(TokenHashUtil.hash(rawToken));
        token.setUser(user);
        token.setExpiresAt(Instant.now().plusSeconds(TOKEN_EXPIRATION_HOURS * 3600));
        token.setUsed(false);
        tokenRepository.save(token);
    }

    public void sendVerificationEmail(User user) {
        String rawToken = generateRawToken();
        saveToken(user, rawToken);

        String verificationUrl = baseUrl + "/api/v1/auth/verify-email?token=" + rawToken;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("KeVend – Verifiko emailin tënd / Verify your email");
        message.setText(
                "Mirë se vini në KeVend!\n\n" +
                        "Klikoni linkun më poshtë për të verifikuar emailin tuaj (skadon pas 24 orësh):\n" +
                        verificationUrl + "\n\n" +
                        "---\n" +
                        "Welcome to KeVend!\n\n" +
                        "Click the link below to verify your email address (expires in 24 hours):\n" +
                        verificationUrl
        );
        try {
            mailSender.send(message);
        } catch (RuntimeException ex) {
            log.warn("Failed to send verification email to {}", user.getEmail(), ex);
            throw ex;
        }
    }

    /**
     * Verifies the raw token from the URL, marks the user as verified.
     */
    @Transactional
    public void verifyEmail(String rawToken) {
        String hash = TokenHashUtil.hash(rawToken);

        EmailVerificationToken token = tokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> i18n.badRequest("error.email_verification.invalid"));

        if (token.isUsed()) {
            throw i18n.badRequest("error.email_verification.used");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw i18n.badRequest("error.email_verification.expired");
        }

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[48]; // 384 bits
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
