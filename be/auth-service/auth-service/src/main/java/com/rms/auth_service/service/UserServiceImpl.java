package com.rms.auth_service.service;

import com.rms.auth_service.dtos.AuthRes;
import com.rms.auth_service.dtos.SignInReq;
import com.rms.auth_service.dtos.SignUpReq;
import com.rms.auth_service.dtos.UserDto;
import com.rms.auth_service.entity.User;
import com.rms.auth_service.repository.UserRepository;
import com.rms.auth_service.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    @Override
    public AuthRes signup(SignUpReq req) {
        final String email = req.getEmail().trim().toLowerCase();
        users.findByEmail(email).ifPresent(u -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        });

        User u = new User();
        u.setFirstName(req.getFirstName());
        u.setLastName(req.getLastName());
        u.setDob(req.getDob());
        u.setDoj(req.getDoj());
        u.setDepartment(req.getDepartment());
        u.setManager(req.getManager());
        u.setRole(req.getRole()); // "employee" | "manager" | "finance" | "admin"
        u.setContactNo(req.getContactNo());
        u.setAddress(req.getAddress());
        u.setPincode(req.getPincode());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.getPassword()));

        users.save(u);

        String token = jwt.issueAccessToken(u.getEmail());
        return new AuthRes(token, "Bearer", jwt.getAccessTokenTtlSeconds(), toDto(u));
    }

    @Override
    public AuthRes login(SignInReq req) {
        final String email = req.getEmail().trim().toLowerCase();

        User u = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!encoder.matches(req.getPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwt.issueAccessToken(u.getEmail());
        return new AuthRes(token, "Bearer", jwt.getAccessTokenTtlSeconds(), toDto(u));
    }
    @Override
    public UserDto findByEmailOrId(String emailOrId) {
        // Try by email first
        return users.findByEmail(emailOrId)
                .or(() -> tryFindById(emailOrId))
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    // helper: try parsing as UUID and searching by ID
    private Optional<User> tryFindById(String idStr) {
        try {
            Long id = Long.parseLong(idStr); // ✅ Your PK is Long, so parse as Long
            return users.findById(id);
        } catch (NumberFormatException e) {
            return Optional.empty(); // not a number, skip ID search
        }
    }

    // --- mapper ---
    private UserDto toDto(User e) {
        return UserDto.builder()
                .id(e.getId() != null ? e.getId().toString() : null)
                .firstName(e.getFirstName())
                .lastName(e.getLastName())
                .name((e.getFirstName() == null ? "" : e.getFirstName()) +
                        (e.getLastName() == null ? "" : " " + e.getLastName()))
                .email(e.getEmail())
                .role(e.getRole())
                .department(e.getDepartment())
                .manager(e.getManager())
                .contactNo(e.getContactNo())
                .address(e.getAddress())
                .pincode(e.getPincode())
                .dob(e.getDob())
                .doj(e.getDoj())
                .build();
    }
}
