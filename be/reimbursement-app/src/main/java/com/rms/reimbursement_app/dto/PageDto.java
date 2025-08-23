package com.rms.reimbursement_app.dto;

import java.util.List;

public record PageDto<T>(
        List<T> content,
        int page,           // 1-based page index for the UI
        int size,
        long totalElements,
        int totalPages
) {}
