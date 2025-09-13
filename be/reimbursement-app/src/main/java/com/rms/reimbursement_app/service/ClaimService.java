// src/main/java/com/rms/reimbursement_app/service/ClaimService.java
package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.dto.CreateClaimRequest;
import com.rms.reimbursement_app.dto.UpdateClaimRequest;
import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.domain.User;
import com.rms.reimbursement_app.repository.ClaimRepository;
import com.rms.reimbursement_app.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimService {

    private final ClaimRepository repo;
    private final UserRepository userRepo;          // ✅ added
    private final EmailService emailService;

    @PersistenceContext
    private EntityManager em;

    // ---- File constraints ----
    private static final long MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_CT = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain", "text/csv"
    );

    // ===================== Create / Read =====================

    @Transactional
    public List<Claim> createBatch(Long userId, List<@Valid CreateClaimRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No claims provided");
        }

        // ✅ resolve and cache user's email once
        final String userEmail = resolveUserEmail(userId);

        var entities = items.stream().map(in -> {
            if (in.getTitle() == null || in.getTitle().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
            }
            Long amountCents = in.getAmountCents();
            if (amountCents == null || amountCents <= 0L) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amountCents must be > 0");
            }
            if (in.getCurrencyCode() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "currencyCode is required");
            }
            if (in.getClaimType() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "claimType is required");
            }

            var c = new Claim();
            c.setUserId(userId);
            c.setUserEmail(userEmail);                // ✅ persist snapshot of email
            c.setTitle(in.getTitle());
            c.setAmountCents(amountCents);
            c.setCurrencyCode(in.getCurrencyCode());
            c.setClaimType(in.getClaimType());
            c.setDescription(in.getDescription());
            c.setReceiptUrl(in.getReceiptUrl());
            c.setStatus(ClaimStatus.PENDING);
            c.setClaimDate(in.getClaimDate() != null ? in.getClaimDate() : LocalDate.now());
            return c;
        }).toList();

        var saved = repo.saveAll(entities);
        em.flush();
        saved.forEach(em::refresh);

        // ✅ Email notifications on create (user + admins)
        for (Claim c : saved) {
            emailService.notifyClaimCreated(
                    safeEmail(c),               // may be null → EmailService should guard
                    c.getId(),
                    c.getTitle(),
                    c.getAmountCents(),
                    c.getCurrencyCode().name()
            );
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Claim> myPending(Long userId) {
        return repo.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ClaimStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<Claim> myRejected(Long userId) {
        return repo.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ClaimStatus.REJECTED);
    }

    @Transactional(readOnly = true)
    public Page<Claim> getAllRecalled(Pageable pageable) {
        return repo.findByStatus(ClaimStatus.RECALLED, pageable);
    }

    @Transactional(readOnly = true)
    public List<Claim> myApproved(Long userId) {
        return repo.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ClaimStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public List<Claim> myClosed(Long userId) {
        var approved = myApproved(userId);
        var rejected = myRejected(userId);
        return Stream.concat(approved.stream(), rejected.stream())
                .sorted(Comparator.comparing(Claim::getCreatedAt).reversed())
                .toList();
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

    // ===================== Status Updates =====================

    @Transactional
    public Claim approve(Long id) {
        var c = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"));
        if (c.getStatus() != ClaimStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending can be approved");
        }
        c.setStatus(ClaimStatus.APPROVED);
        var saved = repo.save(c);

        // ✅ email user — approved
        emailService.notifyApproved(
                safeEmail(saved),
                saved.getId(),
                saved.getTitle(),
                saved.getAmountCents(),
                saved.getCurrencyCode().name()
        );

        return saved;
    }

    @Transactional
    public Claim reject(Long id, String comment) {
        if (comment == null || comment.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin comment required");
        }
        var c = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"));
        if (c.getStatus() != ClaimStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending can be rejected");
        }
        c.setStatus(ClaimStatus.REJECTED);
        c.setAdminComment(comment);
        var saved = repo.save(c);

        // ✅ email user — rejected
        emailService.notifyRejected(
                safeEmail(saved),
                saved.getId(),
                saved.getTitle(),
                comment
        );

        return saved;
    }

    // ===================== Recall Flow (unchanged) =====================

    @Transactional
    public Claim adminStartRecall(Long id, String reason, boolean requireAttachment) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recall reason required");
        }
        var c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"));

        c.setRecallActive(true);
        c.setRecallReason(reason.trim());
        c.setRecallRequireAttachment(requireAttachment);
        c.setResubmitComment(null);
        c.setRecalledAt(Instant.now());
        c.setStatus(ClaimStatus.RECALLED);
        return repo.save(c);
    }

    @Transactional
    public Claim adminRequestAttachment(Long id, String note) {
        if (note == null || note.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment request note required");
        }
        int updated = repo.markNeedAttachment(id, note.trim(), note.trim(), Instant.now());
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found or not updatable");
        }
        return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found after update"));
    }

    @Transactional
    public Claim adminCancelRecall(Long id) {
        var c = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"));
        clearRecallAndSetPending(c);
        return repo.save(c);
    }

    @Transactional
    public Claim resubmit(Long claimId, Long currentUserId, String resubmitComment, MultipartFile optionalFile)
            throws IOException {

        final Claim c = repo.findByIdAndUserId(claimId, currentUserId).orElseThrow(() -> {
            boolean exists = repo.existsById(claimId);
            return new ResponseStatusException(exists ? HttpStatus.FORBIDDEN : HttpStatus.NOT_FOUND,
                    exists ? "Not your claim" : "Claim not found");
        });

        if (!c.isRecallActive()) return c;

        if (optionalFile != null && !optionalFile.isEmpty()) {
            assignAndValidateFile(c, optionalFile);
        }
        if (resubmitComment != null && !resubmitComment.isBlank()) {
            c.setResubmitComment(resubmitComment.trim());
        }

        clearRecallAndSetPending(c);
        return repo.save(c);
    }

    @Transactional
    public Claim resubmitAfterRecall(Long claimId, Long currentUserId, MultipartFile optionalFile, String resubmitComment)
            throws IOException {
        return resubmit(claimId, currentUserId, resubmitComment, optionalFile);
    }

    @Transactional
    public Claim updateClaimAsUser(Long claimId, Long currentUserId, UpdateClaimRequest req) {
        final Claim c = repo.findByIdAndUserId(claimId, currentUserId).orElseThrow(() -> {
            boolean exists = repo.existsById(claimId);
            return new ResponseStatusException(
                    exists ? HttpStatus.FORBIDDEN : HttpStatus.NOT_FOUND,
                    exists ? "Not your claim" : "Claim not found");
        });

        boolean editable =
                c.getStatus() == ClaimStatus.PENDING
                        || c.getStatus() == ClaimStatus.SUBMITTED
                        || (c.getStatus() == ClaimStatus.RECALLED && c.isRecallActive());

        if (!editable) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Claim not editable in current state");
        }

        c.applyUserEditDuringRecall(
                req.getTitle(),
                req.getAmountCents(),
                req.getDescription(),
                req.getClaimDate(),
                req.getCurrencyCode(),
                req.getClaimType()
        );

        if (c.getStatus() == ClaimStatus.RECALLED && c.isRecallActive() && !c.isRecallRequireAttachment()) {
            clearRecallAndSetPending(c);
        }

        return repo.save(c);
    }

    @Transactional
    public void createUserChangeRequest(Long claimId, Long userId, String message) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Change request message required");
        }

        var c = repo.findByIdAndUserId(claimId, userId).orElseThrow(() -> {
            boolean exists = repo.existsById(claimId);
            return new ResponseStatusException(
                    exists ? HttpStatus.FORBIDDEN : HttpStatus.NOT_FOUND,
                    exists ? "Not your claim" : "Claim not found"
            );
        });

        c.setResubmitComment(message.trim());
        c.setResubmittedAt(Instant.now());
        repo.save(c);
    }

    // ===================== Receipt Upload / Download =====================

    @Transactional
    public Claim uploadReceipt(Long claimId, MultipartFile file) throws IOException {
        var claim = repo.findById(claimId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found: " + claimId));
        assignAndValidateFile(claim, file);
        return repo.save(claim);
    }

    @Transactional(readOnly = true)
    public FileData downloadReceipt(Long claimId) {
        var claim = repo.findById(claimId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found: " + claimId));
        if (claim.getReceiptFile() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No receipt uploaded for claim " + claimId);
        }
        return new FileData(
                claim.getReceiptFilename(),
                claim.getReceiptContentType(),
                claim.getReceiptFile()
        );
    }

    @Transactional
    public Claim uploadReceiptForUser(Long claimId, Long currentUserId, boolean isAdmin, MultipartFile file)
            throws IOException {

        final Claim claim = isAdmin
                ? repo.findById(claimId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"))
                : repo.findByIdAndUserId(claimId, currentUserId).orElseThrow(() -> {
            boolean exists = repo.existsById(claimId);
            return new ResponseStatusException(exists ? HttpStatus.FORBIDDEN : HttpStatus.NOT_FOUND,
                    exists ? "Not your claim" : "Claim not found");
        });

        assignAndValidateFile(claim, file);

        if (claim.getStatus() == ClaimStatus.RECALLED && claim.isRecallActive()) {
            clearRecallAndSetPending(claim);
        }

        return repo.save(claim);
    }

    @Transactional(readOnly = true)
    public FileData downloadReceiptForUser(Long claimId, Long currentUserId, boolean isAdmin) {
        final Claim claim = isAdmin
                ? repo.findById(claimId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Claim not found"))
                : repo.findByIdAndUserId(claimId, currentUserId).orElseThrow(() -> {
            boolean exists = repo.existsById(claimId);
            return new ResponseStatusException(exists ? HttpStatus.FORBIDDEN : HttpStatus.NOT_FOUND,
                    exists ? "Not your claim" : "Claim not found");
        });

        if (claim.getReceiptFile() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No receipt uploaded for this claim");
        }

        return new FileData(
                claim.getReceiptFilename(),
                claim.getReceiptContentType(),
                claim.getReceiptFile()
        );
    }

    @Transactional(readOnly = true)
    public boolean receiptExists(Long claimId) {
        var c = repo.findById(claimId).orElse(null);
        if (c == null) return false;
        if (c.getReceiptSize() != null && c.getReceiptSize() > 0) return true;
        if (c.getReceiptFile() != null && c.getReceiptFile().length > 0) return true;
        if (c.getReceiptFilename() != null && !c.getReceiptFilename().isBlank()) return true;
        return c.getReceiptUrl() != null && !c.getReceiptUrl().isBlank();
    }

    // ===================== Helpers =====================

    private void assignAndValidateFile(Claim claim, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }

        var ct = file.getContentType();
        if (ct == null || !ALLOWED_CT.contains(ct)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported file type: " + ct);
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "File too large (max %d bytes)".formatted(MAX_UPLOAD_BYTES));
        }

        claim.setReceiptFile(file.getBytes());
        claim.setReceiptFilename(file.getOriginalFilename());
        claim.setReceiptContentType(ct);
        claim.setReceiptSize(file.getSize());
    }

    private void clearRecallAndSetPending(Claim c) {
        c.setRecallActive(false);
        c.setRecallRequireAttachment(false);
        c.setRecallReason(null);
        c.setResubmittedAt(Instant.now());
        c.setStatus(ClaimStatus.PENDING);
    }

    /** Resolve the user's current email from DB. */
    private String resolveUserEmail(Long userId) {
        return userRepo.findById(userId)
                .map(User::getEmail)
                .orElseGet(() -> {
                    log.warn("No email found for userId={}", userId);
                    return null;
                });
    }

    /** Prefer stored snapshot; fall back to live user relation if needed. */
    private String safeEmail(Claim c) {
        if (c.getUserEmail() != null && !c.getUserEmail().isBlank()) return c.getUserEmail();
        if (c.getUser() != null && c.getUser().getEmail() != null && !c.getUser().getEmail().isBlank()) {
            return c.getUser().getEmail();
        }
        // last resort: resolve via repository
        return resolveUserEmail(c.getUserId());
    }

    // Lightweight DTO for downloads
    public record FileData(String filename, String contentType, byte[] bytes) {}
}
