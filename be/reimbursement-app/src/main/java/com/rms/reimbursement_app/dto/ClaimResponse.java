package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.*;
import lombok.*;
import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class ClaimResponse {
    private Long id;
    private Long userId;
    private String title;
    private Long amountCents;
    private ClaimType claimType;
    private String description;
    private String receiptUrl;
    private ClaimStatus status;
    private String adminComment;
    private Instant createdAt;
    private Instant updatedAt;

    public static ClaimResponse from(Claim c) {
        return ClaimResponse.builder()
                .id(c.getId())
                .userId(c.getUserId())
                .title(c.getTitle())
                .amountCents(c.getAmountCents())
                .claimType(c.getClaimType())
                .description(c.getDescription())
                .receiptUrl(c.getReceiptUrl())
                .status(c.getStatus())
                .adminComment(c.getAdminComment())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
