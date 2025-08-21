
package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimType;
import lombok.Value;

import java.time.Instant;

@Value
public class AdminClaimView {
    Long id;
    Long userId;
    String title;
    long amountCents;
    ClaimType claimType;
    String description;
    String receiptUrl;
    Instant createdAt;   // assuming Claim has createdAt

    public static AdminClaimView from(Claim c) {
        return new AdminClaimView(
                c.getId(),
                c.getUserId(),
                c.getTitle(),
                c.getAmountCents(),
                c.getClaimType(),
                c.getDescription(),
                c.getReceiptUrl(),
                c.getCreatedAt()
        );
    }
}
