// src/main/java/.../mail/EmailService.java
package com.rms.reimbursement_app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.mail.admin}")
    private String adminEmail;

    @Value("${app.web.base-url}")
    private String baseUrl;

    @Async
    public void sendTo(String to, String subject, String body) {
        var msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(body);
        mailSender.send(msg);
    }

    @Async
    public void notifyClaimCreated(String userEmail, Long claimId, String title,
                                   long amountCents, String currency) {
        String amount = String.format("%s %.2f", currency, amountCents / 100.0);
        sendTo(
                userEmail,
                "Claim submitted: #" + claimId,
                """
                Hi,
      
                Your claim has been submitted.
                • Claim ID: #%d
                • Title: %s
                • Amount: %s
      
                We'll email you when it’s reviewed.
                """.formatted(claimId, title, amount)
        );

        sendTo(
                adminEmail,
                "New claim submitted: #" + claimId,
                """
                A new claim was submitted.
      
                • Claim ID: #%d
                • Title: %s
                • Amount: %s
                • Review: %s
                """.formatted(claimId, title, amount, baseUrl + "/admin")
        );
    }

    @Async
    public void notifyApproved(String userEmail, Long claimId, String title,
                               long amountCents, String currency) {
        String amount = String.format("%s %.2f", currency, amountCents / 100.0);
        sendTo(
                userEmail,
                "Claim approved: #" + claimId,
                """
                Great news!
      
                Your claim has been approved.
                • Claim ID: #%d
                • Title: %s
                • Amount: %s
                """.formatted(claimId, title, amount)
        );
    }

    @Async
    public void notifyRejected(String userEmail, Long claimId, String title, String reason) {
        sendTo(
                userEmail,
                "Claim rejected: #" + claimId,
                """
                Your claim was rejected.
      
                • Claim ID: #%d
                • Title: %s
                • Reason: %s
      
                You can review and resubmit if appropriate.
                """.formatted(claimId, title, (reason == null || reason.isBlank()) ? "—" : reason)
        );
    }
}
