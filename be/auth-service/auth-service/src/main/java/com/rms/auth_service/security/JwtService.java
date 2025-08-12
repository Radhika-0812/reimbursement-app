package com.rms.auth_service.security;

public interface JwtService {
    String issueAccessToken(String subject);
    String validateAndGetSubject(String token);
    long   getAccessTokenTtlSeconds();
}
