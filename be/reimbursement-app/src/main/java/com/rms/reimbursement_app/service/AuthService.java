package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.domain.User;
import com.rms.reimbursement_app.dto.LoginRequest;
import com.rms.reimbursement_app.dto.SignupRequest;
import com.rms.reimbursement_app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final BCryptPasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;

    @Value("${app.security.jwt.issuer}")
    String issuer;

    @Value("${app.security.jwt.expires-min}")
    long expiresMin;

    @Transactional
    public void signup(SignupRequest req) {
        // Email must be unique
        users.findByEmail(req.email())
                .ifPresent(u -> { throw new IllegalArgumentException("Email already exists"); });

        // If you added a UNIQUE constraint on users.name (to let claims.user_name FK to it),
        // keep this guard. For this, add existsByNameIgnoreCase(String name) in UserRepository.
        if (users.existsByNameIgnoreCase(req.name())) {
            throw new IllegalArgumentException("Name already taken");
        }

        var u = new User();
        u.setName(req.name().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole("ROLE_USER"); // default role
        u.setDepartment(req.department().trim());
        u.setAddress(req.address().trim());
        u.setContact(req.contact().trim());   // validated by @Pattern in DTO
        u.setPincode(req.pincode().trim());   // validated by @Pattern in DTO

        users.save(u);
    }

    public String login(LoginRequest req) {
        var u = users.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60L * expiresMin))
                .subject(u.getEmail())
                .claim("uid", u.getId())
                .claim("role", u.getRole())
                .build();

        var headers = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
    }
}
