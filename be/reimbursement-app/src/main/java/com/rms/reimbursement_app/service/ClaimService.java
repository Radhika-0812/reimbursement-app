package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.domain.CurrencyCode;
import com.rms.reimbursement_app.dto.CreateClaimRequest;
import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.repository.ClaimRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;



import java.io.IOException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ClaimService {

    private final ClaimRepository repo;

    @PersistenceContext
    private EntityManager em; // for flush + refresh (DB-populated columns)

    // ---- File constraints (adjust as needed) ----
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
    public List<Claim> createBatch(Long userId, List<CreateClaimRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("No claims provided");
        }

        var entities = items.stream().map(in -> {
            var c = new Claim();
            c.setUserId(userId);
            c.setTitle(in.getTitle());
            c.setAmountCents(in.getAmountCents());
            c.setCurrencyCode(in.getCurrencyCode());
            c.setClaimType(in.getClaimType());
            c.setDescription(in.getDescription());
            c.setReceiptUrl(in.getReceiptUrl()); // keep if you still use external URLs
            c.setStatus(ClaimStatus.PENDING);
            c.setClaimDate(in.getClaimDate() != null ? in.getClaimDate() : LocalDate.now());


            return c;
        }).toList();

        var saved = repo.saveAll(entities);

        // Ensure DB triggers/computed columns (e.g., user_name) are visible
        em.flush();
        saved.forEach(em::refresh);

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
        var c = repo.findById(id).orElseThrow();
        if (c.getStatus() != ClaimStatus.PENDING) {
            throw new IllegalStateException("Only pending can be approved");
        }
        c.setStatus(ClaimStatus.APPROVED);
        return repo.save(c);
    }

    @Transactional
    public Claim reject(Long id, String comment) {
        if (comment == null || comment.isBlank()) {
            throw new IllegalArgumentException("Admin comment required");
        }
        var c = repo.findById(id).orElseThrow();
        if (c.getStatus() != ClaimStatus.PENDING) {
            throw new IllegalStateException("Only pending can be rejected");
        }
        c.setStatus(ClaimStatus.REJECTED);
        c.setAdminComment(comment);
        return repo.save(c);
    }

    // ===================== Receipt Upload / Download =====================
    // Existing generic upload/download (kept for compatibility)

    @Transactional
    public Claim uploadReceipt(Long claimId, MultipartFile file) throws IOException {
        var claim = repo.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));
        assignAndValidateFile(claim, file);
        return repo.save(claim);
    }

    @Transactional(readOnly = true)
    public FileData downloadReceipt(Long claimId) {
        var claim = repo.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));
        if (claim.getReceiptFile() == null) {
            throw new IllegalStateException("No receipt uploaded for claim " + claimId);
        }
        return new FileData(
                claim.getReceiptFilename(),
                claim.getReceiptContentType(),
                claim.getReceiptFile()
        );
    }

    /**
     * Owner-enforced upload: only the claim owner or ADMIN can upload/replace the receipt.
     */
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
        return repo.save(claim);
    }

    /**
     * Owner-enforced download: only the claim owner or ADMIN can download the receipt.
     */
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
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File too large (max %d bytes)".formatted(MAX_UPLOAD_BYTES));
        }

        claim.setReceiptFile(file.getBytes());                 // bytea
        claim.setReceiptFilename(file.getOriginalFilename());
        claim.setReceiptContentType(ct);
        claim.setReceiptSize(file.getSize());                  // bigint
    }

    // Lightweight DTO for downloads
    public record FileData(String filename, String contentType, byte[] bytes) {}
}
