package com.rms.auth_service.dtos;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SignInReq {
    @Email @NotBlank private String email;
    @NotBlank private String password;
}
