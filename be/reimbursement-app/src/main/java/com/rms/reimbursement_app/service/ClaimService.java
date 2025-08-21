package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.dto.CreateClaimRequest;
import com.rms.reimbursement_app.domain.*;
import com.rms.reimbursement_app.repository.ClaimRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


import java.util.List;

@Service
@RequiredArgsConstructor
public class ClaimService {
    private final ClaimRepository repo;

    @PersistenceContext
    private EntityManager em; // <-- needed for flush + refresh

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

        var saved = repo.saveAll(entities);

        // ⬇️ Make sure DB triggers run and JPA sees DB-populated columns (user_name)
        em.flush();                 // force INSERTs now
        saved.forEach(em::refresh); // re-read rows -> userName is now populated

        return saved;
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
        var saved = repo.save(c);
        // If you later add a DB trigger that updates timestamps, uncomment:
        // em.flush(); em.refresh(saved);
        return saved;
    }

    @Transactional
    public Claim reject(Long id, String comment) {
        if (comment == null || comment.isBlank()) throw new IllegalArgumentException("Admin comment required");
        var c = repo.findById(id).orElseThrow();
        if (c.getStatus() != ClaimStatus.PENDING) throw new IllegalStateException("Only pending can be rejected");
        c.setStatus(ClaimStatus.REJECTED);
        c.setAdminComment(comment);
        var saved = repo.save(c);
        // em.flush(); em.refresh(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Claim> getAllPending(Pageable pageable) {
        return repo.findByStatus(ClaimStatus.PENDING, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Claim> getAllApproved(Pageable pageable) {
        return repo.findByStatus(ClaimStatus.APPROVED, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Claim> getAllRejected(Pageable pageable) {
        return repo.findByStatus(ClaimStatus.REJECTED, pageable);
    }
}
