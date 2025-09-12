// com/rms/reimbursement_app/domain/Claim.java
package com.rms.reimbursement_app.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "claims")
@Getter @Setter
@DynamicUpdate // only updates changed columns (helps avoid unnecessary DB updates)
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Written from JWT (uid). Relation below is read-only via this FK.
    @Column(nullable = false, name = "user_id")
    private Long userId;

    // ✅ Proper link to the users table (read-only mapping via user_id)
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false, length = 140)
    private String title;

    // 👇 Date user is claiming for (not createdAt)
    @Column(name = "claim_date")
    private LocalDate claimDate;

    // Store amounts in cents/paise
    @Column(nullable = false)
    private Long amountCents;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency_code", length = 3, nullable = false)
    private CurrencyCode currencyCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ClaimType claimType;

    @Column(columnDefinition = "text")
    private String description;

    @Column(columnDefinition = "text")
    private String receiptUrl;

    // ---------- FILE COLUMNS ----------
    @Lob
    @JdbcTypeCode(SqlTypes.BINARY) // maps to Postgres bytea
    @Column(name = "receipt_file", columnDefinition = "bytea")
    private byte[] receiptFile;

    @Column(name = "receipt_filename", length = 255)
    private String receiptFilename;

    @Column(name = "receipt_content_type", length = 100)
    private String receiptContentType;

    @Column(name = "receipt_size")
    private Long receiptSize;
    // ----------------------------------

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ClaimStatus status = ClaimStatus.PENDING;

    // Notes / comments set by Admin when bouncing back
    @Column(columnDefinition = "text")
    private String adminComment;

    /* ===== Recall / Attachment Request fields ===== */

    // Admin has marked this claim as recalled (requires user action)
    @Column(nullable = false)
    private boolean recallActive = false;

    // Optional explanation for recall
    @Column(length = 2000)
    private String recallReason;

    // If admin requires an attachment before resubmitting
    @Column(name = "recall_require_attachment", nullable = false)
    private boolean recallRequireAttachment = false;

    // Timestamps for audit trail
    @Column(name = "recalled_at")
    private Instant recalledAt;

    @Column(name = "resubmitted_at")
    private Instant resubmittedAt;

    // Last comment from user when resubmitting or requesting change
    @Column(length = 2000)
    private String resubmitComment;

    // Standard audit columns
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    void touch() { this.updatedAt = Instant.now(); }

    /* ===== Convenience (read-only) accessors sourced from User ===== */
    @Transient
    public String getUserName() { return user != null ? user.getName() : null; }

    @Transient
    public String getUserEmail() { return user != null ? user.getEmail() : null; }

    @Transient
    public String getDesignation() { return user != null ? user.getDesignation() : null; }

    /* ===== Convenience helpers used by UI/services ===== */

    /** Mark this claim as recalled (set by admin). */
    public void markRecalled(String reason, boolean requireAttachment) {
        this.setStatus(ClaimStatus.RECALLED);
        this.setRecallActive(true);
        this.setRecallReason(reason);
        this.setRecallRequireAttachment(requireAttachment);
        this.setRecalledAt(Instant.now());
    }

    /** Clear recall flags (set by user when resubmitting). */
    public void clearRecall(String resubmitComment) {
        this.setRecallActive(false);
        this.setRecallReason(null);
        this.setRecallRequireAttachment(false);
        this.setResubmitComment(resubmitComment);
        this.setStatus(ClaimStatus.PENDING);
        this.setResubmittedAt(Instant.now());
    }

    /** Does this claim currently have a receipt stored in any form? */
    @Transient
    public boolean getHasReceipt() {
        if (this.getReceiptFile() != null && this.getReceiptFile().length > 0) return true;
        if (this.getReceiptSize() != null && this.getReceiptSize() > 0) return true;
        if (this.getReceiptFilename() != null && !this.getReceiptFilename().isBlank()) return true;
        return this.getReceiptUrl() != null && !this.getReceiptUrl().isBlank();
    }

    /** True when the owner is allowed to edit details during recall flow. */
    @Transient
    public boolean isEditableByOwnerDuringRecall() {
        // Allowed only when admin has recalled AND specifically requested an attachment.
        // We also require the claim to be in RECALLED status (as set in markRecalled).
        return this.recallActive && this.recallRequireAttachment && this.status == ClaimStatus.RECALLED;
    }

    /** Apply safe user-editable fields during recall. */
    public void applyUserEditDuringRecall(String title, Long amountCents, String description, LocalDate claimDate,
                                          CurrencyCode currencyCode, ClaimType claimType) {
        if (!isEditableByOwnerDuringRecall()) {
            throw new IllegalStateException("Claim not editable in current state");
        }
        if (title != null && !title.isBlank()) this.title = title;
        if (amountCents != null && amountCents >= 0) this.amountCents = amountCents;
        if (description != null) this.description = description;
        if (claimDate != null) this.claimDate = claimDate;
        if (currencyCode != null) this.currencyCode = currencyCode;
        if (claimType != null) this.claimType = claimType;
    }
}
