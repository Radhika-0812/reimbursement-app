package com.rms.reimbursement_app.controller;

import com.rms.reimbursement_app.dto.LoginRequest;
import com.rms.reimbursement_app.dto.SignupRequest;
import com.rms.reimbursement_app.dto.TokenResponse;
import com.rms.reimbursement_app.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/signup")
    public void signup(@Valid @RequestBody SignupRequest req) {
        auth.signup(req);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        var user  = auth.authenticate(req);     // verify email/password
        var token = auth.issueToken(user);      // build JWT (adds role claim)
        return new TokenResponse(token);        // { "token": "<jwt>" }
    }
}
