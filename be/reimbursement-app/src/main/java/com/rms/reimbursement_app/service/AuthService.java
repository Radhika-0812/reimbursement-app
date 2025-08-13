package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.domain.User;
import com.rms.reimbursement_app.dto.LoginRequest;
import com.rms.reimbursement_app.dto.SignupRequest;
import com.rms.reimbursement_app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import java.time.Instant;


@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final BCryptPasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    @org.springframework.beans.factory.annotation.Value("${app.security.jwt.issuer}") String issuer;
    @org.springframework.beans.factory.annotation.Value("${app.security.jwt.expires-min}") long expiresMin;

    @Transactional
    public void signup(SignupRequest req) {
        users.findByEmail(req.email()).ifPresent(u -> { throw new IllegalArgumentException("Email already exists"); });
        var u = new User();
        u.setEmail(req.email());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole("ROLE_USER"); // default; you can seed an admin separately
        users.save(u);
    }

    public String login(LoginRequest req) {
        var u = users.findByEmail(req.email()).orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!encoder.matches(req.password(), u.getPasswordHash())) throw new IllegalArgumentException("Invalid credentials");

        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60 * expiresMin))
                .subject(u.getEmail())
                .claim("uid", u.getId())
                .claim("role", u.getRole())
                .build();


        var headers = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();

        return jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
    }
}