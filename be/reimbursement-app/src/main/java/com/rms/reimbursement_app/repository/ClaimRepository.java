package com.rms.reimbursement_app.repository;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ClaimStatus status);
    Page<Claim> findByStatus(ClaimStatus status, Pageable pageable);
}
