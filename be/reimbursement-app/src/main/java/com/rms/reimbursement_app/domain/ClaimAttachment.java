// src/main/java/com/rms/reimbursement_app/domain/ClaimAttachment.java
package com.rms.reimbursement_app.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "claim_attachments")
public class ClaimAttachment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @Column(nullable = false)
    private String storagePath;        // e.g., uploads/claims/123/abc.pdf

    @Column(nullable = false)
    private String originalFilename;

    private String contentType;
    private long sizeBytes;

    private Instant uploadedAt = Instant.now();

    @Column(length = 64)
    private String kind; // e.g., "RECALL_EVIDENCE"

    /* getters/setters */
}
