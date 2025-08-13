package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.dto.*;
import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.service.ClaimService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/claims")
public class ClaimController {
    private final ClaimService service;
    public ClaimController(ClaimService service){ this.service = service; }


    @PostMapping @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public List<ClaimResponse> create(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody List<@Valid CreateClaimRequest> body) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        List<Claim> saved = service.createBatch(userId, body);
        return saved.stream().map(ClaimResponse::from).toList();
    }


    @GetMapping("/me/pending") @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public List<ClaimResponse> myPending(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getClaim("uid").toString());
        return service.myPending(userId).stream().map(ClaimResponse::from).toList();
    }
}
