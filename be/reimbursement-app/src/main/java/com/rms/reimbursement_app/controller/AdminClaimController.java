package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.dto.AdminClaimView;
import com.rms.reimbursement_app.dto.ClaimResponse;
import com.rms.reimbursement_app.dto.RejectClaimRequest;
import com.rms.reimbursement_app.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.*;

import org.springframework.data.web.PageableDefault;

import java.util.*;

@RestController
@RequestMapping("/api/admin/claims")
public class AdminClaimController {
    private final ClaimService service;
    public AdminClaimController(ClaimService service){ this.service = service; }

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

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllPending(@PageableDefault(size = 20) Pageable pageable) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllPending(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    @GetMapping("/approved") @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllApproved(@PageableDefault(size = 20) Pageable pageable) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllApproved(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    @GetMapping("/rejected") @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminClaimView> getAllRejected(@PageableDefault(size = 20) Pageable pageable) {
        Pageable safe = sanitize(pageable);
        var page = service.getAllRejected(safe);
        var mapped = page.getContent().stream().map(AdminClaimView::from).toList();
        return new PageImpl<>(mapped, safe, page.getTotalElements());
    }

    // --- helpers ---
    private static final Set<String> ALLOWED_SORTS = Set.of("id", "createdAt", "amountCents");

    private Pageable sanitize(Pageable pageable) {
        // Trim properties, drop unknowns, default to id DESC; clamp page size (1..100)
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



}
