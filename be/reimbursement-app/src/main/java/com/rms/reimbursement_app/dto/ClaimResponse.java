package com.rms.reimbursement_app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.rms.reimbursement_app.domain.*;
import lombok.*;
import java.math.BigDecimal;
import java.sql.Struct;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClaimResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String title;
    private String userEmail;
    private Long amountCents;
    private CurrencyCode currencyCode;
    private BigDecimal amountRupees;
    private ClaimType claimType;
    private String description;
    private String receiptUrl;
    private ClaimStatus status;
    private String adminComment;
    private LocalDate claimDate;
    private Instant createdAt;
    private Instant updatedAt;
    private String designation;
    private boolean hasReceipt;        // <- FE uses this to show/hide "View receipt"

    public static ClaimResponse from(Claim c) {
        boolean hasReceipt = (c.getReceiptSize() != null && c.getReceiptSize() > 0)
                || (c.getReceiptFile() != null && c.getReceiptFile().length > 0);

        return ClaimResponse.builder()
                .id(c.getId())
                .userId(c.getUserId())
                .userName(c.getUserName())
                .title(c.getTitle())
                .userEmail(c.getUserEmail())
                .amountCents(c.getAmountCents())
                .currencyCode(c.getCurrencyCode())
                .amountRupees(centsToRupees(c.getAmountCents()))
                .claimType(c.getClaimType())
                .description(c.getDescription())
                .receiptUrl(c.getReceiptUrl())
                .status(c.getStatus())
                .adminComment(c.getAdminComment())
                .claimDate(c.getClaimDate())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .designation(c.getDesignation())
                .hasReceipt(hasReceipt)
                .build();
    }

    private static BigDecimal centsToRupees(Long cents) {
        if (cents == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(cents, 2); // divide by 100 with scale=2
    }
}
