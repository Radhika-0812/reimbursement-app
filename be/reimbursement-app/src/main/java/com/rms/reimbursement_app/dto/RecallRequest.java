package com.rms.reimbursement_app.dto;

import jakarta.validation.constraints.NotBlank;

public class RecallRequest {

    @NotBlank
    private String reason;

    private boolean needAttachment;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public boolean isNeedAttachment() { return needAttachment; }
    public void setNeedAttachment(boolean needAttachment) { this.needAttachment = needAttachment; }
}
