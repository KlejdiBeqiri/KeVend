package com.keVend.backend.service;

import com.keVend.backend.dto.ResetPasswordRequest;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.PasswordResetToken;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.PasswordResetTokenRepository;
import com.keVend.backend.repository.UserRepository;
import com.keVend.backend.security.TokenHashUtil;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.core.io.FileSystemResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class PasswordResetService {

    private static final int OTP_TTL_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RNG = new SecureRandom();

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final JavaMailSender mailSender;
    private final I18n i18n;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Transactional
    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String code = createResetCode(user);
            sendResetEmail(user, code);
        });
    }

    @Transactional
    public void verifyResetCode(String email, String code) {
        PasswordResetToken token = loadActiveToken(email);
        validateCode(token, code);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = loadActiveToken(request.getEmail());
        validateCode(token, request.getCode());

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        refreshTokenService.revokeAllTokens(user);

        token.setUsed(true);
        passwordResetTokenRepository.save(token);
    }

    private String createResetCode(User user) {
        passwordResetTokenRepository.deleteByUser(user);
        passwordResetTokenRepository.flush();

        String code = String.format("%05d", RNG.nextInt(100_000));

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setOtpHash(TokenHashUtil.hash(code));
        token.setExpiresAt(Instant.now().plus(OTP_TTL_MINUTES, ChronoUnit.MINUTES));
        passwordResetTokenRepository.save(token);

        return code;
    }

    private void sendResetEmail(User user, String code) {
        try {
            sendResetEmailHtml(user, code);
        } catch (RuntimeException ex) {
            log.warn("Failed to send password reset email to {}", user.getEmail(), ex);
        }
    }

    private void sendResetEmailHtml(User user, String code) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("KeVend | Password reset code");
            Path logoPath = resolveResetEmailLogoPath();
            boolean includeLogo = logoPath != null;
            helper.setText(buildResetEmailHtml(code, includeLogo), true);
            if (includeLogo) {
                helper.addInline("kevend-logo", new FileSystemResource(logoPath));
            }
            mailSender.send(mimeMessage);
        } catch (MessagingException ex) {
            log.warn("Failed to compose HTML password reset email for {}", user.getEmail(), ex);
            sendResetEmailFallback(user, code);
        }
    }

    private void sendResetEmailFallback(User user, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("KeVend | Password reset code");
        message.setText(
                "Password reset code: " + code + "\n" +
                        "This code expires in " + OTP_TTL_MINUTES + " minutes.\n\n" +
                        "If you did not request this change, you can safely ignore this email."
        );
        mailSender.send(message);
    }

    private String buildResetEmailHtml(String code, boolean includeLogo) {
        String brandBlock = includeLogo
                ? """
                    <div style="text-align:center;">
                      <img src="cid:kevend-logo" alt="KeVend" style="display:inline-block;height:56px;width:auto;max-width:220px;" />
                    </div>
                  """
                : """
                    <div style="font-size:32px;font-weight:700;line-height:1;color:#ffffff;text-align:center;">KeVend</div>
                  """;

        return """
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>KeVend Password Reset</title>
                  </head>
                  <body style="margin:0;padding:0;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#f3f6fb;padding:32px 16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                            <tr>
                              <td style="padding:28px 32px;background:linear-gradient(90deg,#3080FF 0%%,#00358B 100%%);color:#ffffff;">
                                %s
                                <div style="margin-top:18px;font-size:28px;font-weight:700;line-height:1.2;">Reset your password</div>
                                <div style="margin-top:10px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.88);">
                                  Use the one-time code below to continue changing your password.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:32px;">
                                <div style="font-size:15px;line-height:1.7;color:#334155;">
                                  We received a request to reset your KeVend password. Enter this verification code in the app:
                                </div>

                                <div style="margin:28px 0 24px 0;padding:18px 20px;border-radius:18px;background-color:#f8fbff;border:1px solid #d9e8ff;text-align:center;">
                                  <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Verification code</div>
                                  <div style="margin-top:10px;font-size:34px;font-weight:700;letter-spacing:0.26em;color:#00358b;">%s</div>
                                </div>

                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                                  <tr>
                                    <td style="padding:14px 16px;border-radius:16px;background-color:#0f172a;color:#ffffff;">
                                      <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#b7c4d8;">Expires in</div>
                                      <div style="margin-top:6px;font-size:20px;font-weight:700;">%d minutes</div>
                                    </td>
                                  </tr>
                                </table>

                                <div style="margin-top:24px;font-size:14px;line-height:1.7;color:#475569;">
                                  If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 32px 28px 32px;border-top:1px solid #e9eef5;font-size:12px;line-height:1.7;color:#64748b;">
                                This is an automated security message from KeVend. Please do not reply directly to this email.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(brandBlock, code, OTP_TTL_MINUTES);
    }

    private Path resolveResetEmailLogoPath() {
        String userDir = System.getProperty("user.dir");
        List<Path> candidates = List.of(
                Paths.get(userDir, "frontend", "assets", "logo.png"),
                Paths.get(userDir, "..", "frontend", "assets", "logo.png"),
                Paths.get(userDir, "assets", "logo.png")
        );

        for (Path candidate : candidates) {
            Path normalized = candidate.normalize();
            if (Files.exists(normalized)) {
                return normalized;
            }
        }

        return null;
    }

    private PasswordResetToken loadActiveToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> i18n.badRequest("error.password_reset.invalid_code"));

        return passwordResetTokenRepository.findFirstByUserAndUsedFalseOrderByCreatedAtDesc(user)
                .orElseThrow(() -> i18n.badRequest("error.password_reset.invalid_code"));
    }

    private void validateCode(PasswordResetToken token, String code) {
        if (token.getAttempts() >= MAX_ATTEMPTS) {
            throw i18n.badRequest("error.password_reset.too_many");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw i18n.badRequest("error.password_reset.invalid_code");
        }

        if (!token.getOtpHash().equals(TokenHashUtil.hash(code))) {
            token.setAttempts(token.getAttempts() + 1);
            passwordResetTokenRepository.save(token);
            throw i18n.badRequest("error.password_reset.invalid_code");
        }
    }
}
