package com.rms.auth_service.dtos;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AuthRes {
    private String token;
    private String tokenType = "Bearer";
    private long   expiresIn;
}
