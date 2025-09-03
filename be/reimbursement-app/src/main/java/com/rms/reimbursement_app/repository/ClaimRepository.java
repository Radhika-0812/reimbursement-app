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
}
