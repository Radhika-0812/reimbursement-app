package com.rms.auth_service.dtos;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuthRes {
    private String token;
    private String tokenType;
    private long   expiresIn;
    private UserDto user;
}
