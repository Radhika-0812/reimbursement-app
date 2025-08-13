package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.*;

public record SignupRequest(@Email @NotBlank String email, @NotBlank String password) {}

