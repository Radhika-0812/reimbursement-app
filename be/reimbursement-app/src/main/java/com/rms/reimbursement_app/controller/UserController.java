// src/main/java/com/rms/reimbursement_app/controller/UserController.java
package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.dto.UserProfileResponse;
import com.rms.reimbursement_app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public UserProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        // Try numeric user id from "uid" first (matches your Claim usage elsewhere),
        // fall back to "sub" (if numeric) and then to email claim.
        Long userId = null;
        try {
            Object raw = jwt.getClaim("uid");
            if (raw != null) userId = Long.valueOf(String.valueOf(raw));
        } catch (Exception ignored) {}

        if (userId == null) {
            try {
                String sub = jwt.getSubject();
                if (sub != null && sub.matches("\\d+")) userId = Long.valueOf(sub);
            } catch (Exception ignored) {}
        }

        String email = null;
        try {
            email = jwt.getClaimAsString("email");
            if (email != null && email.isBlank()) email = null;
        } catch (Exception ignored) {}

        var user = userService.getByIdOrEmail(userId, email);
        return UserProfileResponse.from(user);
    }
}

