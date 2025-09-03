// src/main/java/com/rms/reimbursement_app/controller/ClaimController.java
package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.dto.ClaimResponse;
import com.rms.reimbursement_app.dto.CreateClaimRequest;
import com.rms.reimbursement_app.dto.PageDto;
import com.rms.reimbursement_app.service.ClaimService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService service;

    public ClaimController(ClaimService service) {
        this.service = service;
    }

    // ----------------------- Create -----------------------

    @PostMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public List<ClaimResponse> create(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody List<@Valid CreateClaimRequest> body) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        List<Claim> saved = service.createBatch(userId, body);
        return saved.stream().map(ClaimResponse::from).toList();
    }

    // ----------------------- Me: listings with simple FE pagination -----------------------

    @GetMapping("/me/pending")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public PageDto<ClaimResponse> myPending(@AuthenticationPrincipal Jwt jwt,
                                            @RequestParam(defaultValue = "1") int page,
                                            @RequestParam(defaultValue = "10") int size) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var all = service.myPending(userId).stream().map(ClaimResponse::from).toList();
        return paginate(all, page, size);
    }

    @GetMapping("/me/closed")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public PageDto<ClaimResponse> getMyClosed(@AuthenticationPrincipal Jwt jwt,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var all = service.myClosed(userId).stream().map(ClaimResponse::from).toList();
        return paginate(all, page, size);
    }

    @GetMapping("/me/rejected")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public PageDto<ClaimResponse> getMyRejectedClaims(@AuthenticationPrincipal Jwt jwt,
                                                      @RequestParam(defaultValue = "1") int page,
                                                      @RequestParam(defaultValue = "10") int size) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var all = service.myRejected(userId).stream().map(ClaimResponse::from).toList();
        return paginate(all, page, size);
    }

    @GetMapping("/me/approved")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public PageDto<ClaimResponse> getMyApprovedClaims(@AuthenticationPrincipal Jwt jwt,
                                                      @RequestParam(defaultValue = "1") int page,
                                                      @RequestParam(defaultValue = "10") int size) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var all = service.myApproved(userId).stream().map(ClaimResponse::from).toList();
        return paginate(all, page, size);
    }

    // ----------------------- NEW: Me: claims that are in recall -----------------------

    /**
     * Returns the current user's claims that have been recalled by admin.
     * (Filters your pending list for recallActive=true.)
     */
    @GetMapping("/me/recall")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public List<ClaimResponse> myRecall(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        return service.myPending(userId).stream()
                .filter(c -> Boolean.TRUE.equals(c.isRecallActive()))
                .map(ClaimResponse::from)
                .toList();
    }

    // ----------------------- Receipt upload/download (owner-only; admin bypass) -----------------------

    /**
     * Upload or replace a receipt file for a claim (owner-only unless ADMIN).
     * Form field name must be "file".
     */
    @PostMapping(path = "/{id}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<UploadResponse> uploadReceipt(@PathVariable Long id,
                                                        @AuthenticationPrincipal Jwt jwt,
                                                        Authentication authentication,
                                                        @RequestParam("file") MultipartFile file) throws Exception {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        var saved = service.uploadReceiptForUser(id, userId, isAdmin, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UploadResponse(
                        saved.getId(),
                        saved.getReceiptFilename(),
                        saved.getReceiptContentType(),
                        saved.getReceiptSize()
                ));
    }

    /**
     * HEAD probe for receipt existence (used by PendingClaims page).
     * 200 if exists, 404 if not. Avoids loading the whole blob.
     */
    @RequestMapping(value = "/api/claims/{id}/receipt", method = RequestMethod.HEAD)
    public ResponseEntity<Void> headReceipt(@PathVariable Long id,
                                            @AuthenticationPrincipal Jwt jwt,
                                            Authentication authentication) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        // Owner-only logic is enforced inside service.downloadReceiptForUser; for HEAD we can cheaply check:
        boolean exists = service.receiptExists(id);
        return exists ? ResponseEntity.ok().build() : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    /**
     * Download the stored receipt (owner-only unless ADMIN).
     */
    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable Long id,
                                                  @AuthenticationPrincipal Jwt jwt,
                                                  Authentication authentication) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        var fileData = service.downloadReceiptForUser(id, userId, isAdmin);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(fileData.contentType()));
        headers.setContentDisposition(ContentDisposition.attachment().filename(fileData.filename()).build());
        headers.setContentLength(fileData.bytes().length);

        return new ResponseEntity<>(fileData.bytes(), headers, HttpStatus.OK);
    }

    // ----------------------- Resubmit after recall -----------------------

    /**
     * JSON resubmit (no file). Use when admin recall didn't require an attachment,
     * or the existing receipt is still valid.
     *
     * Body: { "comment": "Added taxi bill number to description" }
     */
    @PatchMapping(path = "/{id}/resubmit", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ClaimResponse resubmitJson(@PathVariable Long id,
                                      @AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody ResubmitRequest req) throws Exception {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var updated = service.resubmitAfterRecall(id, userId, null, req.comment());
        return ClaimResponse.from(updated);
    }

    /**
     * Multipart resubmit with (optional) new receipt file + comment.
     * Use field name "file" for the new receipt, and "comment" for text.
     */
    @PatchMapping(path = "/{id}/resubmit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ClaimResponse resubmitMultipart(@PathVariable Long id,
                                           @AuthenticationPrincipal Jwt jwt,
                                           @RequestPart(name = "file", required = false) MultipartFile file,
                                           @RequestPart(name = "comment", required = false) String comment) throws Exception {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        var updated = service.resubmitAfterRecall(id, userId, file, comment);
        return ClaimResponse.from(updated);
    }

    // ----------------------- Helpers -----------------------

    private static PageDto<ClaimResponse> paginate(List<ClaimResponse> all, int page, int size) {
        int safeSize = Math.max(1, size);
        int total = all.size();
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) safeSize));
        int oneBasedPage = Math.max(1, page);
        int fromIdx = (oneBasedPage - 1) * safeSize;
        int toIdx = Math.min(fromIdx + safeSize, total);
        List<ClaimResponse> content = (fromIdx >= total || fromIdx < 0) ? List.of() : all.subList(fromIdx, toIdx);
        return new PageDto<>(content, oneBasedPage, safeSize, total, totalPages);
    }

    // Small response payload for upload endpoint
    public record UploadResponse(Long claimId, String filename, String contentType, Long size) {}

    // JSON request for resubmit
    public record ResubmitRequest(@Size(max = 2000) String comment) {}
}
