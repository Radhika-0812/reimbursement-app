package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class RejectClaimRequest {
    @NotBlank
    private String adminComment;
}
