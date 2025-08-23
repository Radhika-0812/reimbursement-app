// com/rms/reimbursement_app/domain/Claim.java
package com.rms.reimbursement_app.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "claims")
@Getter @Setter
@DynamicUpdate // only updates changed columns (also helps avoid weird binds)
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Write this from JWT (uid). Relation below is read-only via this FK.
    @Column(nullable = false, name = "user_id")
    private Long userId;

    // ✅ Proper link to the users table (read-only mapping via user_id)
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false, length = 140)
    private String title;




    // store amounts in cents/paise
    @Column(nullable = false)
    private Long amountCents;

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

    @Column(columnDefinition = "text")
    private String adminComment;

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

    // -------- Convenience (read-only) accessors sourced from User --------
    @Transient
    public String getUserName() {
        return user != null ? user.getName() : null;
    }

    @Transient
    public String getUserEmail() {
        return user != null ? user.getEmail() : null;
    }

    @Transient
    public String getDesignation() {
        return user != null ? user.getDesignation() : null;
    }
}
