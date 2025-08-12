package com.rms.auth_service.controller;

import com.rms.auth_service.dtos.*;
import com.rms.auth_service.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService service;

    @PostMapping("/signup")
    public ResponseEntity<AuthRes> signup(@Valid @RequestBody SignUpReq req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.signup(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthRes> login(@Valid @RequestBody SignInReq req) {
        return ResponseEntity.ok(service.login(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageRes> logout() {
        return ResponseEntity.ok(new MessageRes("Logged out"));
    }
}
