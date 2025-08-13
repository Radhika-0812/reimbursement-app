package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.dto.CreateClaimRequest;
import com.rms.reimbursement_app.domain.*;
import com.rms.reimbursement_app.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service @RequiredArgsConstructor
public class ClaimService {
    private final ClaimRepository repo;

    @Transactional
    public List<Claim> createBatch(Long userId, List<CreateClaimRequest> items) {
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("No claims provided");
        var entities = items.stream().map(in -> {
            var c = new Claim();
            c.setUserId(userId);
            c.setTitle(in.getTitle());
            c.setAmountCents(in.getAmountCents());
            c.setClaimType(in.getClaimType());
            c.setDescription(in.getDescription());
            c.setReceiptUrl(in.getReceiptUrl());
            c.setStatus(ClaimStatus.PENDING);
            return c;
        }).toList();
        return repo.saveAll(entities);
    }

    @Transactional(readOnly = true)
    public List<Claim> myPending(Long userId) {
        return repo.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ClaimStatus.PENDING);
    }

    @Transactional
    public Claim approve(Long id) {
        var c = repo.findById(id).orElseThrow();
        if (c.getStatus() != ClaimStatus.PENDING) throw new IllegalStateException("Only pending can be approved");
        c.setStatus(ClaimStatus.APPROVED);
        return repo.save(c);
    }

    @Transactional
    public Claim reject(Long id, String comment) {
        if (comment == null || comment.isBlank()) throw new IllegalArgumentException("Admin comment required");
        var c = repo.findById(id).orElseThrow();
        if (c.getStatus() != ClaimStatus.PENDING) throw new IllegalStateException("Only pending can be rejected");
        c.setStatus(ClaimStatus.REJECTED);
        c.setAdminComment(comment);
        return repo.save(c);
    }
}
