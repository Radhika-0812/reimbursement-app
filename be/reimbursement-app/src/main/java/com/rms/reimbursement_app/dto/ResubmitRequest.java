// src/main/java/com/rms/reimbursement_app/dto/ResubmitRequest.java
package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.NotBlank;

public record ResubmitRequest(
        @NotBlank String comment
) {}
