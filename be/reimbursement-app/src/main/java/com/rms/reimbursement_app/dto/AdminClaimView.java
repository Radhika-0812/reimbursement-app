
package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimType;
import lombok.Value;

import java.time.Instant;

@Value
public class AdminClaimView {
    Long id;
    Long userId;
    String userName;
    String userEmail;
    String title;
    long amountCents;
    ClaimType claimType;
    String description;
    String adminComment;
    String receiptUrl;
    String designation;

    Instant createdAt;   // assuming Claim has createdAt

    public static AdminClaimView from(Claim c) {
        return new AdminClaimView(
                c.getId(),
                c.getUserId(),
                c.getUserName(),
                c.getUserEmail(),
                c.getTitle(),
                c.getAmountCents(),
                c.getClaimType(),
                c.getDescription(),
                c.getReceiptUrl(),
                c.getAdminComment(),
                c.getDesignation(),
                c.getCreatedAt()
        );
    }
}
