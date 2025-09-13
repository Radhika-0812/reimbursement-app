package com.rms.reimbursement_app.repository;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {

    // ------- Existing queries -------
    List<Claim> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ClaimStatus status);

    Page<Claim> findByStatus(ClaimStatus status, Pageable pageable);

    Optional<Claim> findByIdAndUserId(Long id, Long userId);

    List<Claim> findAllByCreatedAtBetweenOrderByCreatedAtDesc(Instant from, Instant to);

    List<Claim> findAllByCreatedAtBetweenAndStatusOrderByCreatedAtDesc(Instant from, Instant to, ClaimStatus status);

    Page<Claim> findByRecallActiveTrue(Pageable pageable);

    // ------- Convenience/guard -------
    boolean existsByIdAndUserId(Long id, Long userId);

    // ------- Receipt-focused accessors -------
    // Projection to avoid loading the whole entity when only receipt fields are needed.
    interface ClaimReceiptProjection {
        Long getId();
        String getReceiptFilename();
        String getReceiptContentType();
        Long getReceiptSize();
        byte[] getReceiptFile();
    }

    @Query("""
           select c.id as id,
                  c.receiptFilename as receiptFilename,
                  c.receiptContentType as receiptContentType,
                  c.receiptSize as receiptSize,
                  c.receiptFile as receiptFile
           from Claim c
           where c.id = :id
           """)
    Optional<ClaimReceiptProjection> findReceiptById(@Param("id") Long id);

    Optional<Claim> findByIdAndUser_Id(Long id, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
           update Claim c
           set c.receiptFile = null,
               c.receiptFilename = null,
               c.receiptContentType = null,
               c.receiptSize = null
           where c.id = :id
           """)
    int clearReceiptById(@Param("id") Long id);

    // ------- Recall / Attachment workflow -------

    /**
     * Admin marks a claim as needing attachment (recall).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
   update Claim c
   set c.recallActive = true,
       c.recallRequireAttachment = true,
       c.recallReason = :reason,
       c.adminComment = :comment,
       c.status = :status,
       c.recalledAt = :ts
   where c.id = :claimId
   """)
    int markNeedAttachment(@Param("claimId") Long claimId,
                           @Param("reason") String reason,
                           @Param("comment") String comment,
                           @Param("ts") Instant ts,
                           @Param("status") ClaimStatus status);


    /**
     * User uploads attachment → clear recall flags, back to PENDING.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
           update Claim c
           set c.recallActive = false,
               c.recallRequireAttachment = false,
               c.recallReason = null,
               c.status = com.rms.reimbursement_app.domain.ClaimStatus.PENDING,
               c.resubmittedAt = :ts,
               c.resubmitComment = :comment
           where c.id = :claimId
           """)
    int clearNeedAttachment(@Param("claimId") Long claimId,
                            @Param("comment") String comment,
                            @Param("ts") Instant ts);
}
