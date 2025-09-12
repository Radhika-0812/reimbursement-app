package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.dto.AdminClaimView;
import com.rms.reimbursement_app.dto.ClaimResponse;
import com.rms.reimbursement_app.dto.RejectClaimRequest;
import com.rms.reimbursement_app.service.ClaimService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/claims")
public class AdminClaimController {

    private final ClaimService service;

    public AdminClaimController(ClaimService service){ this.service = service; }

    /* ===================== Approve / Reject ===================== */

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimResponse approve(@PathVariable Long id) {
        return ClaimResponse.from(service.approve(id));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimResponse reject(@PathVariable Long id, @Valid @RequestBody RejectClaimRequest req) {
        return ClaimResponse.from(service.reject(id, req.getAdminComment()));
    }

    /* ===================== Recall Flow ===================== */

    /**
     * Start recall (compat): admin can optionally require an attachment.
     * PATCH /api/admin/claims/{id}/recall
     * Body: { "reason": "...", "requireAttachment": true|false }
     */
    @PatchMapping(
            path = "/{id}/recall",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimResponse startRecall(@PathVariable Long id, @Valid @RequestBody RecallRequest req) {
        return ClaimResponse.from(service.adminStartRecall(id, req.getReason(), req.isRequireAttachment()));
    }

    /**
     * Shorthand to specifically mark "Need Attachment".
     * PATCH /api/admin/claims/{id}/need-attachment
     * Body: { "note": "Please attach receipt" }
     */
    @PatchMapping(
            path = "/{id}/need-attachment",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimResponse needAttachment(@PathVariable Long id, @Valid @RequestBody NeedAttachmentRequest req) {
        return ClaimResponse.from(service.adminRequestAttachment(id, req.getNote()));
    }

    /**
     * Cancel recall and clear flags.
     * PATCH /api/admin/claims/{id}/recall/cancel
     */
    @PatchMapping(
            path = "/{id}/recall/cancel",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimResponse cancelRecall(@PathVariable Long id) {
        return ClaimResponse.from(service.adminCancelRecall(id));
    }

    /* ===================== Admin Lists ===================== */

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllPending(@PageableDefault(size = 20) Pageable pageable,
                                              @RequestParam(required = false) String from,
                                              @RequestParam(required = false) String to,
                                              @RequestParam(required = false) String email) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllPending(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    @GetMapping("/approved")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllApproved(@PageableDefault(size = 20) Pageable pageable,
                                               @RequestParam(required = false) String from,
                                               @RequestParam(required = false) String to,
                                               @RequestParam(required = false) String email) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllApproved(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    @GetMapping("/recalled")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllRecalled(@PageableDefault(size = 20) Pageable pageable) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllRecalled(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }
    
    @GetMapping("/rejected")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllRejected(@PageableDefault(size = 20) Pageable pageable,
                                               @RequestParam(required = false) String from,
                                               @RequestParam(required = false) String to,
                                               @RequestParam(required = false) String email) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllRejected(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> ping() { return Map.of("ok", "admin"); }

    /* ===================== Helpers ===================== */

    private static final Set<String> ALLOWED_SORTS = Set.of("id", "createdAt", "amountCents");

    private Pageable sanitize(Pageable pageable) {
        List<Sort.Order> safeOrders = pageable.getSort().stream()
                .map(o -> {
                    String prop = o.getProperty() == null ? "" : o.getProperty().trim();
                    return ALLOWED_SORTS.contains(prop) ? new Sort.Order(o.getDirection(), prop) : null;
                })
                .filter(Objects::nonNull)
                .toList();

        Sort sort = safeOrders.isEmpty()
                ? Sort.by(Sort.Direction.DESC, "id")
                : Sort.by(safeOrders);

        int size = Math.max(1, Math.min(pageable.getPageSize(), 100));
        int page = Math.max(0, pageable.getPageNumber());
        return PageRequest.of(page, size, sort);
    }

    /* ===================== DTOs ===================== */

    public static class RecallRequest {
        @NotBlank
        private String reason;
        private boolean requireAttachment;

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public boolean isRequireAttachment() { return requireAttachment; }
        public void setRequireAttachment(boolean requireAttachment) { this.requireAttachment = requireAttachment; }
    }

    public static class NeedAttachmentRequest {
        @NotBlank
        private String note;

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}
