package com.rms.reimbursement_app.domain;
import jakarta.persistence.*; import lombok.*; import java.time.*;

@Entity @Table(name="claims")
@Getter @Setter
public class Claim {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long userId;
    @Column(name = "user_name", nullable = false, length = 30, insertable = false, updatable = false)
    private String userName;
    @Column(nullable=false, length=140) private String title;
    @Column(nullable=false) private Long amountCents;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=40) private ClaimType claimType;
    @Column(columnDefinition="text") private String description;
    @Column(columnDefinition="text") private String receiptUrl;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ClaimStatus status = ClaimStatus.PENDING;
    @Column(columnDefinition="text") private String adminComment;
    @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
    @Column(nullable=false) private Instant updatedAt = Instant.now();
    @PreUpdate void touch(){ this.updatedAt = Instant.now(); }
}