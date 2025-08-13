package com.rms.reimbursement_app.repository;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ClaimStatus status);
}
