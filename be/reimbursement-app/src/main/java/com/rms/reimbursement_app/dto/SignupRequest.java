package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.*;

public record SignupRequest(

        @NotBlank
        @Size(max = 30)
        String name,

        @Email
        @NotBlank
        @Size(max = 190)
        String email,

        @NotBlank
        @Size(min = 8, max = 100)
        String password,

        @NotBlank
        @Size(max = 30)
        String department,

        @NotBlank
        @Size(max = 100)
        String address,

        @NotBlank
        @Pattern(regexp = "\\d{10}", message = "contact must be exactly 10 digits")
        String contact,

        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "pincode must be exactly 6 digits")
        String pincode
) {}
