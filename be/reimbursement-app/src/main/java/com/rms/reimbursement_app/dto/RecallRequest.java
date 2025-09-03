// src/main/java/com/rms/reimbursement_app/dto/RecallRequest.java
package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.NotBlank;

public record RecallRequest(
        @NotBlank String reason,
        Boolean requireAttachment // if you want to enforce an attachment before resubmit
) {}
