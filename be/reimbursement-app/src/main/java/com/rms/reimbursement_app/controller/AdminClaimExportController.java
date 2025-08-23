package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.dto.ClaimExportRow;
import com.rms.reimbursement_app.repository.ClaimRepository;
import com.rms.reimbursement_app.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;


@RestController
@RequestMapping("/api/admin/claims/export")
@RequiredArgsConstructor
public class AdminClaimExportController {

    private final ClaimRepository claimRepo;
    private final ExportService exportService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public void exportByRange(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "xlsx") String format,
            @RequestParam(required = false) String status,  // string to validate manually
            HttpServletResponse resp
    ) throws Exception {
        // Validate date inputs
        final ZoneId zone = ZoneId.of("Asia/Kolkata");
        final Instant start, end;
        try {
            start = LocalDate.parse(from).atStartOfDay(zone).toInstant();
            end   = LocalDate.parse(to).plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1);
        } catch (DateTimeParseException e) {
            resp.setStatus(400);
            resp.setContentType("text/plain");
            resp.getWriter().write("Invalid date. Use YYYY-MM-DD for 'from' and 'to'.");
            return;
        }
        if (end.isBefore(start)) {
            resp.setStatus(400);
            resp.setContentType("text/plain");
            resp.getWriter().write("'to' must be >= 'from'.");
            return;
        }

        // Validate status (optional)
        ClaimStatus st = null;
        if (status != null && !status.isBlank()) {
            try {
                st = ClaimStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                resp.setStatus(400);
                resp.setContentType("text/plain");
                resp.getWriter().write("Invalid status. Allowed: PENDING, APPROVED, REJECTED, CLOSED");
                return;
            }
        }

        var claims = (st == null)
                ? claimRepo.findAllByCreatedAtBetweenOrderByCreatedAtDesc(start, end)
                : claimRepo.findAllByCreatedAtBetweenAndStatusOrderByCreatedAtDesc(start, end, st);

        var rows = claims.stream().map(ClaimExportRow::of).toList();

        String base = "claims_" + from + "_to_" + to + (st == null ? "" : "_" + st.name().toLowerCase());
        String filename = base + "." + format.toLowerCase();
        String safe = URLEncoder.encode(filename, StandardCharsets.UTF_8);
        resp.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + safe);

        if ("xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            resp.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            exportService.writeExcel(resp.getOutputStream(), rows);
        } else if ("pdf".equalsIgnoreCase(format)) {
            resp.setContentType(MediaType.APPLICATION_PDF_VALUE);
            exportService.writePdf(resp.getOutputStream(), rows);
        } else {
            resp.setStatus(400);
            resp.setContentType("text/plain");
            resp.getWriter().write("Invalid format. Allowed: xlsx, pdf");
            return;
        }
        resp.flushBuffer();
    }
}
