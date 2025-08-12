package com.rms.auth_service.service;

import com.rms.auth_service.dtos.*;
import com.rms.auth_service.entity.User;
import com.rms.auth_service.repository.UserRepository;
import com.rms.auth_service.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    @Override
    public AuthRes signup(SignUpReq req) {
        if (users.findByEmail(req.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User u = new User();
        u.setFirstName(req.getFirstName());
        u.setLastName(req.getLastName());
        u.setDob(req.getDob());
        u.setDoj(req.getDoj());
        u.setDepartment(req.getDepartment());
        u.setManager(req.getManager());
        u.setRole(req.getRole());
        u.setContactNo(req.getContactNo());
        u.setAddress(req.getAddress());
        u.setPincode(req.getPincode());
        u.setEmail(req.getEmail());
        u.setPasswordHash(encoder.encode(req.getPassword()));
        users.save(u);

        String token = jwt.issueAccessToken(u.getEmail());
        return new AuthRes(token, "Bearer", jwt.getAccessTokenTtlSeconds());
    }

    @Override
    public AuthRes login(SignInReq req) {
        var u = users.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!encoder.matches(req.getPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        String token = jwt.issueAccessToken(u.getEmail());
        return new AuthRes(token, "Bearer", jwt.getAccessTokenTtlSeconds());
    }
}
