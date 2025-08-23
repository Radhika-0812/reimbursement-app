package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record ClaimExportRow(
        Long id,
        String userName,
        String title,
        String claimType,
        String status,
        Long amountCents,
        String createdAt,
        String updatedAt,
        String adminComment
) {
    public static ClaimExportRow of(Claim c) {
        var fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.of("Asia/Kolkata"));
        return new ClaimExportRow(
                c.getId(),
                c.getUserName(),
                c.getTitle(),
                c.getClaimType() == null ? "" : c.getClaimType().name(),
                c.getStatus() == null ? ClaimStatus.PENDING.name() : c.getStatus().name(),
                c.getAmountCents(),
                c.getCreatedAt() == null ? "" : fmt.format(c.getCreatedAt()),
                c.getUpdatedAt() == null ? "" : fmt.format(c.getUpdatedAt()),
                c.getAdminComment() == null ? "" : c.getAdminComment()
        );
    }



}
