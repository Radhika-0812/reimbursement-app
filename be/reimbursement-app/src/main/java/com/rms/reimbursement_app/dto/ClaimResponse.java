package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.domain.ClaimType;
import com.rms.reimbursement_app.domain.CurrencyCode;

import java.time.Instant;
import java.time.LocalDate;

public class ClaimResponse {

    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;   // ✅ snapshot or live

    private String title;
    private LocalDate claimDate;
    private Long amountCents;
    private CurrencyCode currencyCode;
    private ClaimType claimType;
    private String description;

    private String receiptUrl;
    private boolean hasReceipt;

    private ClaimStatus status;

    // Recall-related
    private boolean recallActive;
    private boolean recallRequireAttachment;
    private String recallReason;
    private Instant recalledAt;
    private Instant resubmittedAt;

    private String adminComment;
    private Instant createdAt;
    private Instant updatedAt;

    public static ClaimResponse from(Claim c) {
        ClaimResponse r = new ClaimResponse();
        r.id = c.getId();
        r.userId = c.getUserId();
        r.userName = c.getUserName();
        r.userEmail = c.getEffectiveUserEmail(); // ✅ use snapshot (or fallback to relation)

        r.title = c.getTitle();
        r.claimDate = c.getClaimDate();
        r.amountCents = c.getAmountCents();
        r.currencyCode = c.getCurrencyCode();
        r.claimType = c.getClaimType();
        r.description = c.getDescription();

        r.receiptUrl = c.getReceiptUrl();
        r.hasReceipt = c.getHasReceipt();

        r.status = c.getStatus();

        r.recallActive = c.isRecallActive();
        r.recallRequireAttachment = c.isRecallRequireAttachment();
        r.recallReason = c.getRecallReason();
        r.recalledAt = c.getRecalledAt();
        r.resubmittedAt = c.getResubmittedAt();

        r.adminComment = c.getAdminComment();
        r.createdAt = c.getCreatedAt();
        r.updatedAt = c.getUpdatedAt();
        return r;
    }

    // --- getters ---
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public String getUserEmail() { return userEmail; }
    public String getTitle() { return title; }
    public LocalDate getClaimDate() { return claimDate; }
    public Long getAmountCents() { return amountCents; }
    public CurrencyCode getCurrencyCode() { return currencyCode; }
    public ClaimType getClaimType() { return claimType; }
    public String getDescription() { return description; }
    public String getReceiptUrl() { return receiptUrl; }
    public boolean isHasReceipt() { return hasReceipt; }
    public ClaimStatus getStatus() { return status; }
    public boolean isRecallActive() { return recallActive; }
    public boolean isRecallRequireAttachment() { return recallRequireAttachment; }
    public String getRecallReason() { return recallReason; }
    public Instant getRecalledAt() { return recalledAt; }
    public Instant getResubmittedAt() { return resubmittedAt; }
    public String getAdminComment() { return adminComment; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
