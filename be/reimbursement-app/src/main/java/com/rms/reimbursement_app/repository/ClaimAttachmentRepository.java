// src/main/java/com/rms/reimbursement_app/repository/ClaimAttachmentRepository.java
package com.rms.reimbursement_app.repository;

import com.rms.reimbursement_app.domain.ClaimAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimAttachmentRepository extends JpaRepository<ClaimAttachment, Long> {
}
