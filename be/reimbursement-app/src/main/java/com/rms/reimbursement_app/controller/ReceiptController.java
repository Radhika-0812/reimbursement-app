package com.rms.reimbursement_app.controller;
import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ReceiptController {

    private final ClaimRepository claimRepository;

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
        return exists ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }
}
