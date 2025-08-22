package com.rms.reimbursement_app.dto;

import com.rms.reimbursement_app.domain.User;

public record UserProfileResponse(
        String name,
        String email,
        String department,
        String address,
        String contactNo
) {
    public static UserProfileResponse from(User u) {
        return new UserProfileResponse(
                u.getName(),
                u.getEmail(),
                u.getDepartment(),
                u.getAddress(),
                u.getContact()
        );
    }
}

