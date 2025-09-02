package com.rms.reimbursement_app.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimType;
import com.rms.reimbursement_app.domain.CurrencyCode;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class CreateClaimRequest {
    @NotBlank
    private String title;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate claimDate;


    @NotNull
    @Positive
    private Long amountCents;


    private  CurrencyCode currencyCode;

    @NotNull
    private ClaimType claimType;

    private String description;

    private String receiptUrl;


}
