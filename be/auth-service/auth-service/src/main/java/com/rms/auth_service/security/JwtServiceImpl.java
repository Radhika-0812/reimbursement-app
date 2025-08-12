package com.rms.auth_service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtServiceImpl implements JwtService {

    private final SecretKey key;
    private final String issuer;
    private final long ttlSeconds;
    private final long clockSkewSeconds;

    public JwtServiceImpl(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer:rms-auth}") String issuer,
            @Value("${app.jwt.ttl-seconds:1800}") long ttlSeconds,
            @Value("${app.jwt.clock-skew-seconds:60}") long clockSkewSeconds
    ) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 chars");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.ttlSeconds = ttlSeconds;
        this.clockSkewSeconds = clockSkewSeconds;
    }

    @Override
    public String issueAccessToken(String subject) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subject)
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    @Override
    public String validateAndGetSubject(String token) {
        JwtParser parser = Jwts.parser().verifyWith(key).build();
        Jws<Claims> jws = parser.parseSignedClaims(token);
        Claims c = jws.getPayload();

        Instant now = Instant.now();
        if (c.getExpiration() == null || c.getExpiration().toInstant().isBefore(now.minusSeconds(clockSkewSeconds))) {
            throw new JwtException("Token expired");
        }
        if (c.getIssuedAt() != null && c.getIssuedAt().toInstant().isAfter(now.plusSeconds(clockSkewSeconds))) {
            throw new JwtException("Token iat in future");
        }
        if (issuer != null && !issuer.equals(c.getIssuer())) {
            throw new JwtException("Invalid issuer");
        }
        return c.getSubject();
    }

    @Override
    public long getAccessTokenTtlSeconds() { return ttlSeconds; }
}
