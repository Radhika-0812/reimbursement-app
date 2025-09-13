// src/main/java/com/rms/reimbursement_app/service/EmailService.java
package com.rms.reimbursement_app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    // Allow "Nice Name <email@domain>" or plain email. Provide a safe default.
    @Value("${app.mail.from:Reimbursement App <noreply@example.com>}")
    private String from;

    // Comma-separated list of admin emails; default to empty so startup never fails.
    @Value("${app.mail.admin.to:}")
    private String adminToCsv;

    // Base URL for links in emails. Default to localhost dev URL if not configured.
    @Value("${app.web.base-url:http://localhost:5173}")
    private String baseUrl;

    private List<String> adminRecipients() {
        if (adminToCsv == null || adminToCsv.isBlank()) return List.of();
        return Arrays.stream(adminToCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Async
    public void sendTo(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            log.warn("Skipping email: missing recipient for subject '{}'", subject);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
            log.debug("Sent email to {} with subject '{}'", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {} (subject '{}'): {}", to, subject, e.getMessage(), e);
        }
    }

    @Async
    public void sendToAdmins(String subject, String body) {
        List<String> admins = adminRecipients();
        if (admins.isEmpty()) {
            log.debug("No admin recipients configured; skipping admin email '{}'", subject);
            return;
        }
        // Send one-by-one so a single failure doesn’t cancel others
        for (String admin : admins) {
            sendTo(admin, subject, body);
        }
    }

    @Async
    public void notifyClaimCreated(String userEmail, Long claimId, String title,
                                   long amountCents, String currency) {
        String amount = formatAmount(amountCents, currency);

        // User notification
        sendTo(
                userEmail,
                "Claim submitted: #" + claimId,
                """
                Hi,

                Your claim has been submitted.
                • Claim ID: #%d
                • Title: %s
                • Amount: %s

                We’ll email you when it’s reviewed.
                """.formatted(claimId, safe(title), amount)
        );

        // Admin notification(s)
        sendToAdmins(
                "New claim submitted: #" + claimId,
                """
                A new claim was submitted.

                • Claim ID: #%d
                • Title: %s
                • Amount: %s
                • Review: %s
                """.formatted(claimId, safe(title), amount, baseUrl + "/admin")
        );
    }

    @Async
    public void notifyApproved(String userEmail, Long claimId, String title,
                               long amountCents, String currency) {
        String amount = formatAmount(amountCents, currency);
        sendTo(
                userEmail,
                "Claim approved: #" + claimId,
                """
                Great news!

                Your claim has been approved.
                • Claim ID: #%d
                • Title: %s
                • Amount: %s
                """.formatted(claimId, safe(title), amount)
        );
    }

    @Async
    public void notifyRejected(String userEmail, Long claimId, String title, String reason) {
        String why = (reason == null || reason.isBlank()) ? "—" : reason;
        sendTo(
                userEmail,
                "Claim rejected: #" + claimId,
                """
                Your claim was rejected.

                • Claim ID: #%d
                • Title: %s
                • Reason: %s

                You can review and resubmit if appropriate.
                """.formatted(claimId, safe(title), why)
        );
    }

    // ---------- helpers ----------

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String formatAmount(long amountCents, String currency) {
        double amount = amountCents / 100.0d;
        return String.format("%s %.2f", currency == null ? "" : currency, amount);
    }
}
