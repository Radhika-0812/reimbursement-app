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

    @Value("${app.security.jwt.issuer:rms-auth}")
    String issuer;

    @Value("${app.security.jwt.expires-min:120}")
    long expiresMin;

    @Transactional
    public void signup(SignupRequest req) {
        // Uniqueness
        users.findByEmail(req.email().trim().toLowerCase())
                .ifPresent(u -> { throw new IllegalArgumentException("Email already exists"); });



        var u = new User();
        u.setName(req.name().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setPasswordHash(encoder.encode(req.password()));
        // normalize role to Spring style ROLE_*
        String role = "ROLE_USER";
        u.setRole(role);

        u.setDepartment(req.department().trim());
        u.setDesignation(req.designation().trim());
        u.setAddress(req.address().trim());
        u.setContact(req.contact().trim());   // validated by DTO
        u.setPincode(req.pincode().trim());   // validated by DTO

        users.save(u);
    }

    /**
     * Verifies credentials and returns the User entity (for controller to build a JWT).
     * Throws IllegalArgumentException on bad credentials.
     */
    public User authenticate(LoginRequest req) {
        var email = req.email().trim().toLowerCase();
        var u = users.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        return u;
    }

    /**
     * Issues a JWT for a given authenticated user. Adds 'role' claim (ROLE_*),
     * 'uid', standard 'sub', issuer, iat, exp.
     */
    public String issueToken(User u) {
        var now = Instant.now();
        String role = u.getRole();
        if (role == null || role.isBlank()) role = "ROLE_USER";
        if (!role.startsWith("ROLE_")) role = "ROLE_" + role;

        var claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60L * expiresMin))
                .subject(u.getEmail())
                .claim("uid", u.getId())
                .claim("role", role)  // <-- SecurityConfig's converter uses this
                .build();

        var headers = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
    }

    /** Backward-compatible: if you still want a single call that returns a token. */
    public String login(LoginRequest req) {
        return issueToken(authenticate(req));
    }
}
