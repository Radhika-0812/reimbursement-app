// src/main/java/com/rms/reimbursement_app/controller/ReceiptController.java
package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.repository.ClaimRepository;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

/**
 * Handles extra uploads when an Admin has recalled a claim and marked it
 * as needing an attachment.
 */
@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ReceiptController {

    private final ClaimRepository claimRepository;

    /**
     * User uploads the missing attachment after admin recall.
     * Endpoint: POST /api/claims/{id}/attachments/missing
     */
    @PostMapping(path = "/{id}/attachments/missing", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> uploadMissingAttachment(@PathVariable Long id,
                                                        @AuthenticationPrincipal Jwt jwt,
                                                        @RequestPart("file") @NotNull MultipartFile file)
            throws IOException {

        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        Claim claim = claimRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found or not owned by you"));

        if (!claim.isRecallRequireAttachment()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This claim does not require an attachment");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        // Store directly in claim (in your current design receipts are inline on Claim)
        claim.setReceiptFile(file.getBytes());
        claim.setReceiptFilename(file.getOriginalFilename());
        claim.setReceiptContentType(file.getContentType());
        claim.setReceiptSize(file.getSize());

        // Clear recall requirement → back to pending
        claim.clearRecall("Attachment provided by user");

        claimRepository.save(claim);
        return ResponseEntity.ok().build();
    }

    /**
     * Quick HEAD probe to check if a receipt/attachment exists for a claim.
     * Endpoint: HEAD /api/claims/{id}/receipt/exists
     */
    @RequestMapping(value = "/{id}/receipt/exists", method = RequestMethod.HEAD)
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> headReceipt(@PathVariable Long id) {
        boolean exists = claimRepository.findById(id)
                .map(Claim::getHasReceipt)
                .orElse(false);
        return exists ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
