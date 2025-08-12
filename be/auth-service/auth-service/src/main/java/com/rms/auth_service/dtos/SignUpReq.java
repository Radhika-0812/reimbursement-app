package com.rms.auth_service.dtos;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SignUpReq {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotNull @Past private LocalDate dob;
    @NotNull @PastOrPresent private LocalDate doj;
    @NotBlank private String department;
    @NotBlank private String manager;
    @NotBlank private String role;
    @NotBlank @Pattern(regexp = "^[0-9]{10}$") private String contactNo;
    @NotBlank private String address;
    @NotBlank @Pattern(regexp = "^[0-9]{6}$") private String pincode;
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 8, max = 64) private String password;
}
