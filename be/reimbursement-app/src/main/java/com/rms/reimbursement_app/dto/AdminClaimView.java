
package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.domain.ClaimType;
import com.rms.reimbursement_app.domain.CurrencyCode;
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
    CurrencyCode currencyCode;
    ClaimType claimType;
    String description;
    String adminComment;
    String receiptUrl;
    String designation;
    ClaimStatus status;

    Instant createdAt;   // assuming Claim has createdAt

    public static AdminClaimView from(Claim c) {
        return new AdminClaimView(
                c.getId(),
                c.getUserId(),
                c.getUserName(),
                c.getUserEmail(),
                c.getTitle(),
                c.getAmountCents(),
                c.getCurrencyCode(),
                c.getClaimType(),
                c.getDescription(),
                c.getAdminComment(),
                c.getReceiptUrl(),
                c.getDesignation(),
                c.getStatus(),
                c.getCreatedAt()
        );
    }
}
