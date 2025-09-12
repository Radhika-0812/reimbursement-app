package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.ClaimType;
import com.rms.reimbursement_app.domain.CurrencyCode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class UpdateClaimRequest {

    @NotBlank
    private String title;

    @NotNull
    @Min(0)
    private Long amountCents;

    private String description;     // optional
    private LocalDate claimDate;    // optional
    private CurrencyCode currencyCode; // optional (keep null to not change)
    private ClaimType claimType;       // optional

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getAmountCents() { return amountCents; }
    public void setAmountCents(Long amountCents) { this.amountCents = amountCents; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getClaimDate() { return claimDate; }
    public void setClaimDate(LocalDate claimDate) { this.claimDate = claimDate; }

    public CurrencyCode getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(CurrencyCode currencyCode) { this.currencyCode = currencyCode; }

    public ClaimType getClaimType() { return claimType; }
    public void setClaimType(ClaimType claimType) { this.claimType = claimType; }
}
