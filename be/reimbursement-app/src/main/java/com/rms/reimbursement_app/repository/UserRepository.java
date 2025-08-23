package com.rms.reimbursement_app.repository;

import com.rms.reimbursement_app.domain.Claim;
import com.rms.reimbursement_app.domain.ClaimStatus;
import com.rms.reimbursement_app.domain.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

//    boolean existsByNameIgnoreCase(@NotBlank @Size(max = 30) String email);
}

