package com.rms.reimbursement_app.service;

import com.rms.reimbursement_app.domain.User;
import com.rms.reimbursement_app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository users;

    @Transactional(readOnly = true)
    public User getByIdOrEmail(Long id, String email) {
        if (id != null) {
            return users.findById(id).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
        if (email != null && !email.isBlank()) {
            return users.findByEmail(email).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No identifier provided");
    }
}
