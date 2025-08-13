package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.ClaimType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class CreateClaimRequest {
    @NotBlank
    private String title;

    @NotNull
    @Positive
    private Long amountCents;

    @NotNull
    private ClaimType claimType;

    private String description;

    private String receiptUrl;
}
